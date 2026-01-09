import { config } from '@/config';
import { logger } from '@/utils/logger';

interface Message {
  role: string;
  content: string;
}

export class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';

  constructor() {
    this.apiKey = config.ai.groq.apiKey;
    if (!this.apiKey) {
      logger.warn('Groq API key not configured');
    }
  }

  async generate(userMessage: string, conversationHistory: Message[] = []): Promise<string> {
    if (!this.apiKey) {
      return this.getMockResponse(userMessage);
    }

    try {
      const messages = [
        ...conversationHistory.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Groq API error:', error);
        return this.getMockResponse(userMessage);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'I could not generate a response.';
    } catch (error) {
      logger.error('Groq service error:', error);
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
      const messages = [
        ...conversationHistory.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true,
        }),
      });

      if (!response.ok) return;

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
      logger.error('Groq streaming error:', error);
    }
  }

  private getMockResponse(message: string): string {
    return `This is a demo response from Eldoria AI. You asked about "${message.substring(0, 40)}...". Configure GROQ_API_KEY for real AI responses from Groq's Llama models.`;
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