import { exec, ExecException } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

const execAsync = promisify(exec);

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  timestamp: string;
  executionTimeMs: number;
}

export interface CodeExecutionOptions {
  timeoutMs?: number;
  memoryLimitMb?: number;
  allowNetwork?: boolean;
  allowFileAccess?: boolean;
}

export class CodeExecutionService {
  private sandboxDir: string;
  private maxExecutionTime: number;
  private maxMemory: number;

  constructor() {
    // Create a temporary directory for sandboxed execution
    this.sandboxDir = path.join(os.tmpdir(), 'eldoria-code-sandbox');
    this.maxExecutionTime = 10000; // 10 seconds default
    this.maxMemory = 512; // 512MB default

    // Ensure sandbox directory exists
    this.ensureSandboxDirectory();
    
    logger.info(`🔒 Code execution service initialized (sandbox: ${this.sandboxDir})`);
  }

  private ensureSandboxDirectory(): void {
    try {
      if (!fs.existsSync(this.sandboxDir)) {
        fs.mkdirSync(this.sandboxDir, { recursive: true });
      }
    } catch (error) {
      logger.error('Failed to create sandbox directory:', error);
      throw new Error('Could not initialize code execution sandbox');
    }
  }

  private createSandboxFile(code: string, language: string): string {
    const fileId = uuidv4();
    const fileExt = language === 'python' ? 'py' : 'js';
    const filePath = path.join(this.sandboxDir, `${fileId}.${fileExt}`);
    
    try {
      fs.writeFileSync(filePath, code, 'utf8');
      return filePath;
    } catch (error) {
      logger.error('Failed to create sandbox file:', error);
      throw new Error('Could not create sandbox file');
    }
  }

  private cleanupSandboxFile(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      logger.warn('Failed to cleanup sandbox file:', error);
    }
  }

  private getExecutionCommand(filePath: string, language: string, options: CodeExecutionOptions = {}): string {
    const timeout = options.timeoutMs || this.maxExecutionTime;
    const memoryLimit = options.memoryLimitMb || this.maxMemory;
    
    if (language === 'python') {
      return `timeout ${Math.floor(timeout / 1000)}s python3 ${filePath}`;
    } else if (language === 'javascript') {
      return `timeout ${Math.floor(timeout / 1000)}s node --max-old-space-size=${memoryLimit} ${filePath}`;
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
  }

  private sanitizeOutput(output: string): string {
    // Basic output sanitization to prevent log injection
    return output
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI escape codes
      .replace(/[\x00-\x1f\x7f-\x9f]/g, ''); // Remove control characters
  }

  async executeCode(
    code: string,
    language: 'python' | 'javascript',
    options: CodeExecutionOptions = {}
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const filePath = this.createSandboxFile(code, language);
    
    try {
      const command = this.getExecutionCommand(filePath, language, options);
      logger.info(`🚀 Executing ${language} code (timeout: ${options.timeoutMs || this.maxExecutionTime}ms)`);

      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeoutMs || this.maxExecutionTime,
        killSignal: 'SIGKILL',
        maxBuffer: 1024 * 1024, // 1MB buffer
        cwd: this.sandboxDir,
        env: this.getSafeEnvironment(options),
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: this.sanitizeOutput(stdout),
        error: stderr ? this.sanitizeOutput(stderr) : undefined,
        exitCode: 0,
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (error instanceof Error) {
        const execError = error as ExecException;
        
        logger.error(`❌ Code execution failed: ${execError.message}`);
        
        return {
          success: false,
          output: execError.stdout ? this.sanitizeOutput(execError.stdout) : undefined,
          error: this.sanitizeOutput(execError.message),
          exitCode: execError.code,
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime,
        };
      }

      return {
        success: false,
        error: 'Unknown execution error',
        exitCode: 1,
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
      };
    } finally {
      // Clean up the temporary file
      this.cleanupSandboxFile(filePath);
    }
  }

  private getSafeEnvironment(options: CodeExecutionOptions = {}): NodeJS.ProcessEnv {
    // Create a restricted environment for sandboxed execution
    const safeEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      HOME: this.sandboxDir,
      TMPDIR: this.sandboxDir,
      NODE_ENV: 'sandbox',
      // Explicitly disable network access unless allowed
      ...(options.allowNetwork ? {} : { HTTP_PROXY: 'http://0.0.0.0', HTTPS_PROXY: 'http://0.0.0.0' }),
    };

    // Block potentially dangerous environment variables
    const dangerousVars = ['NPM_TOKEN', 'GITHUB_TOKEN', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    dangerousVars.forEach(varName => {
      delete safeEnv[varName];
    });

    return safeEnv;
  }

  async validateCodeSafety(code: string, language: string): Promise<{ safe: boolean; issues?: string[] }> {
    // Basic static analysis for potentially dangerous code
    const issues: string[] = [];
    
    if (language === 'python') {
      // Check for common dangerous Python patterns
      const dangerousPatterns = [
        { pattern: /import\s+os/, reason: 'OS module can execute system commands' },
        { pattern: /import\s+subprocess/, reason: 'Subprocess can execute arbitrary commands' },
        { pattern: /import\s+sys/, reason: 'Sys module can access system functions' },
        { pattern: /__import__\(/, reason: 'Dynamic imports can bypass restrictions' },
        { pattern: /exec\(/, reason: 'Exec can execute arbitrary code' },
        { pattern: /eval\(/, reason: 'Eval can execute arbitrary code' },
      ];

      dangerousPatterns.forEach(({ pattern, reason }) => {
        if (pattern.test(code)) {
          issues.push(`Python: ${reason}`);
        }
      });
    } else if (language === 'javascript') {
      // Check for common dangerous JavaScript patterns
      const dangerousPatterns = [
        { pattern: /require\('child_process'\)/, reason: 'Child process can execute system commands' },
        { pattern: /require\('fs'\)/, reason: 'FS module can access file system' },
        { pattern: /eval\(/, reason: 'Eval can execute arbitrary code' },
        { pattern: /Function\(/, reason: 'Function constructor can execute arbitrary code' },
        { pattern: /new\s+Function/, reason: 'Function constructor can execute arbitrary code' },
        { pattern: /process\.env/, reason: 'Access to environment variables' },
      ];

      dangerousPatterns.forEach(({ pattern, reason }) => {
        if (pattern.test(code)) {
          issues.push(`JavaScript: ${reason}`);
        }
      });
    }

    return {
      safe: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  async executeSafeCode(
    code: string,
    language: 'python' | 'javascript',
    options: CodeExecutionOptions = {}
  ): Promise<CodeExecutionResult> {
    // First validate code safety
    const safetyCheck = await this.validateCodeSafety(code, language);
    
    if (!safetyCheck.safe) {
      logger.warn(`🛑 Blocked potentially unsafe code: ${safetyCheck.issues?.join('; ')}`);
      
      return {
        success: false,
        error: `Code blocked for safety reasons: ${safetyCheck.issues?.join(', ')}`,
        exitCode: 403,
        timestamp: new Date().toISOString(),
        executionTimeMs: 0,
      };
    }

    // If code is safe, execute it
    return this.executeCode(code, language, options);
  }

  cleanupOldSandboxFiles(maxAgeHours: number = 24): void {
    try {
      const files = fs.readdirSync(this.sandboxDir);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(this.sandboxDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAgeMs) {
          try {
            fs.unlinkSync(filePath);
            logger.info(`🗑️ Cleaned up old sandbox file: ${file}`);
          } catch (error) {
            logger.warn(`Failed to cleanup old file ${file}:`, error);
          }
        }
      });
    } catch (error) {
      logger.error('Failed to cleanup old sandbox files:', error);
    }
  }

  getSandboxInfo(): { directory: string; maxExecutionTime: number; maxMemory: number } {
    return {
      directory: this.sandboxDir,
      maxExecutionTime: this.maxExecutionTime,
      maxMemory: this.maxMemory,
    };
  }
}