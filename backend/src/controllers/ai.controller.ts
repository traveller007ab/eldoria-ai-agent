import { Request, Response } from 'express';
import { prisma } from '@/db/client';
import { GeminiService } from '@/services/ai/GeminiService';
import { GroqService } from '@/services/ai/GroqService';
import { AgentOrchestrator } from '@/services/ai/AgentOrchestrator';
import { AppError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';

const geminiService = new GeminiService();
const groqService = new GroqService();

export const aiController = {
  async chat(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { message, sessionId, model = 'gemini-pro', stream = false } = req.body;

    if (!message) {
      throw new AppError(400, 'Message is required', 'VALIDATION_ERROR');
    }

    let session;
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
      });
    }

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId,
          title: message.substring(0, 50),
          model,
          messages: {
            create: [{ role: 'user', content: message }],
          },
        },
        include: { messages: true },
      });
    }

    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message,
      },
    });

    const conversationHistory = session.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const context = {
      userId,
      sessionId: session.id,
      conversationHistory,
      availableTools: [],
    };

    let response: string;
    try {
      if (model === 'groq-llama') {
        response = await groqService.generate(message, conversationHistory);
      } else {
        response = await geminiService.generate(message, conversationHistory);
      }
    } catch (error) {
      logger.error('AI generation failed:', error);
      response = 'I apologize, but I encountered an error processing your request. Please try again.';
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: response,
        metadata: { model },
      },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    res.json({
      message: assistantMessage,
      session: {
        id: session.id,
        title: session.title,
      },
    });
  },

  async stream(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { message, sessionId, model = 'gemini-pro' } = req.body;

    if (!message) {
      throw new AppError(400, 'Message is required', 'VALIDATION_ERROR');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let session;
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
      });
    }

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId,
          title: message.substring(0, 50),
          model,
        },
      });
    }

    const conversationHistory = session.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const stream = model === 'groq-llama'
        ? groqService.streamGenerate(message, conversationHistory)
        : geminiService.streamGenerate(message, conversationHistory);

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: message,
        },
      });

      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: fullResponse,
          metadata: { model, streamed: true },
        },
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      logger.error('AI streaming failed:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
    }
  },

  async agentExecute(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { task, projectId } = req.body;

    if (!task) {
      throw new AppError(400, 'Task is required', 'VALIDATION_ERROR');
    }

    const context = {
      userId,
      sessionId: '',
      projectId,
      conversationHistory: [],
      availableTools: [],
    };

    const orchestrator = new AgentOrchestrator(context);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    orchestrator.on('task:created', (task: any) => {
      res.write(`data: ${JSON.stringify({ event: 'task:created', task })}\n\n`);
    });

    orchestrator.on('task:planning', (data: any) => {
      res.write(`data: ${JSON.stringify({ event: 'task:planning', ...data })}\n\n`);
    });

    orchestrator.on('task:planned', (data: any) => {
      res.write(`data: ${JSON.stringify({ event: 'task:planned', ...data })}\n\n`);
    });

    orchestrator.on('step:started', (step: any) => {
      res.write(`data: ${JSON.stringify({ event: 'step:started', step })}\n\n`);
    });

    orchestrator.on('step:completed', (data: any) => {
      res.write(`data: ${JSON.stringify({ event: 'step:completed', ...data })}\n\n`);
    });

    orchestrator.on('task:completed', (data: any) => {
      res.write(`data: ${JSON.stringify({ event: 'task:completed', ...data })}\n\n`);
      res.end();
    });

    orchestrator.on('task:failed', (data: any) => {
      res.write(`data: ${JSON.stringify({ event: 'task:failed', ...data })}\n\n`);
      res.end();
    });

    try {
      await orchestrator.executeTask(task);
    } catch (error) {
      logger.error('Agent execution failed:', error);
      res.write(`data: ${JSON.stringify({ event: 'error', error: 'Execution failed' })}\n\n`);
      res.end();
    }
  },
};