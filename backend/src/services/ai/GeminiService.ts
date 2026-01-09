import { config } from '@/config';
import { logger } from '@/utils/logger';

interface Message {
  role: string;
  content: string;
}

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    this.apiKey = config.ai.gemini.apiKey;
    if (!this.apiKey) {
      logger.warn('Gemini API key not configured');
    }
  }

  async generate(userMessage: string, conversationHistory: Message[] = []): Promise<string> {
    if (!this.apiKey) {
      return this.getMockResponse(userMessage);
    }

    try {
      const history = conversationHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const response = await fetch(
        `${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              ...history,
              { role: 'user', parts: [{ text: userMessage }] },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        logger.error('Gemini API error:', error);
        return this.getMockResponse(userMessage);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response.';
    } catch (error) {
      logger.error('Gemini service error:', error);
      return this.getMockResponse(userMessage);
    }
  }

  async *streamGenerate(userMessage: string, conversationHistory: Message[] = []): AsyncGenerator<string> {
    if (!this.apiKey) {
      const response = this.getMockResponse(userMessage);
      for (const chunk of this.chunkResponse(response)) {
        yield chunk;
      }
      return;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/gemini-pro:streamGenerateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              ...conversationHistory.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
              { role: 'user', parts: [{ text: userMessage }] },
            ],
          }),
        }
      );

      if (!response.ok) {
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        yield chunk;
      }
    } catch (error) {
      logger.error('Gemini streaming error:', error);
    }
  }

  private getMockResponse(message: string): string {
    const responses = [
      `I understand you're asking about "${message.substring(0, 50)}...". This is a demonstration response from Eldoria AI. In production, this would call the Gemini API with your configured key.`,
      `That's an interesting question about "${message.substring(0, 30)}...". To enable real AI responses, please configure your GEMINI_API_KEY in the environment variables.`,
      `I can help with that! The Eldoria AI platform supports multiple AI models. Currently running in demo mode. Configure API keys for full functionality.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private chunkResponse(response: string): string[] {
    const words = response.split(' ');
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length > 50) {
        chunks.push(currentChunk);
        currentChunk = word + ' ';
      } else {
        currentChunk += word + ' ';
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    
    return chunks;
  }
}