import { BaseLog } from '@/types/logging';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  environment?: string;
  service?: string;
  version?: string;
}

class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      environment: process.env.NODE_ENV || 'development',
      service: 'chatgenius',
      version: process.env.NEXT_PUBLIC_VERSION || '0.0.0',
      ...options
    };
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata: Record<string, any> = {}
  ): BaseLog {
    const timestamp = new Date().toISOString();
    
    // Remove sensitive data
    const sanitizedMetadata = this.sanitizeMetadata(metadata);

    return {
      timestamp,
      level,
      message,
      service: this.options.service!,
      environment: this.options.environment!,
      version: this.options.version!,
      metadata: sanitizedMetadata
    };
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...metadata };

    Object.keys(sanitized).forEach(key => {
      // Redact sensitive keys
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
      
      // Mask email addresses
      if (typeof sanitized[key] === 'string' && 
          sanitized[key].includes('@') && 
          key.toLowerCase().includes('email')) {
        const [local, domain] = sanitized[key].split('@');
        sanitized[key] = `${local[0]}***@${domain}`;
      }
    });

    return sanitized;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const logEntry = this.createLogEntry(level, message, metadata);

    // In development, format logs for readability
    if (this.options.environment === 'development') {
      console.log(
        `[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`,
        metadata ? '\n' + JSON.stringify(metadata, null, 2) : ''
      );
      return;
    }

    // In production, output structured logs
    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.options.environment === 'development') {
      this.log('debug', message, metadata);
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, any>): void {
    const errorMetadata = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...metadata
      }
    } : metadata;

    this.log('error', message, errorMetadata);
  }
}

export const logger = new Logger(); 