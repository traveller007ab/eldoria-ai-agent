/**
 * Unified API Client
 * Centralized API client with error handling, caching, and typing
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
  meta?: {
    page?: number;
    totalPages?: number;
    totalItems?: number;
  };
}

export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTime?: number; // in ms
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private cacheTime: number;
  
  constructor(config: {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
    cacheTime?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.defaultHeaders = config.headers || {};
    this.defaultTimeout = config.timeout || 30000; // 30 seconds
    this.cacheTime = config.cacheTime || 5 * 60 * 1000; // 5 minutes
    this.cache = new Map();
    
    // Clean cache periodically
    setInterval(() => this.cleanCache(), 60 * 1000);
  }
  
  async get<T>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, config);
  }
  
  async post<T>(
    endpoint: string,
    body: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, config);
  }
  
  async put<T>(
    endpoint: string,
    body: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, config);
  }
  
  async delete<T>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }
  
  async patch<T>(
    endpoint: string,
    body: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body, config);
  }
  
  private async request<T>(
    method: string,
    endpoint: string,
    config: ApiRequestConfig | undefined,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const cacheKey = `${method}:${endpoint}`;
    
    // Check cache for GET requests
    if (method === 'GET' && (config?.cache !== false)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTime) {
        return { data: cached.data as T };
      }
    }
    
    let retries = config?.retries ?? 3;
    let lastError: Error | null = null;
    
    while (retries > 0) {
      try {
        const response = await this.fetchWithTimeout(
          method,
          endpoint,
          config?.timeout ?? this.defaultTimeout,
          body
        );
        
        if (!response.ok) {
          throw this.createApiError(response);
        }
        
        const data = await response.json();
        
        // Cache GET responses
        if (method === 'GET') {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }
        
        return { data };
      } catch (error) {
        lastError = error as Error;
        retries--;
        
        // Don't retry on client errors (4xx)
        if (error instanceof ApiErrorClass && error.status && error.status >= 400 && error.status < 500) {
          break;
        }
        
        // Wait before retry
        if (retries > 0) {
          await this.delay(1000);
        }
      }
    }
    
    return {
      data: {} as T,
      error: {
        message: lastError?.message || 'Request failed after retries',
        details: lastError,
      }
    };
  }
  
  private async fetchWithTimeout(
    method: string,
    endpoint: string,
    timeout: number,
    body?: unknown
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }
  
  private createApiError(response: Response): ApiError {
    return {
      message: response.statusText || 'Request failed',
      status: response.status,
      code: `HTTP_${response.status}`,
    };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTime) {
        this.cache.delete(key);
      }
    }
  }
  
  public clearCache(): void {
    this.cache.clear();
  }
  
  public setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }
  
  public removeHeader(key: string): void {
    delete this.defaultHeaders[key];
  }
}

// Custom error class for API errors
class ApiErrorClass extends Error {
  status?: number;
  code?: string;
  
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Create API instances
export const createApiClient = (config: {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  cacheTime?: number;
}) => new ApiClient(config);
