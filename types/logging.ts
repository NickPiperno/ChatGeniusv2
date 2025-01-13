export interface BaseLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service: string;
  environment: string;
  version: string;
  metadata: Record<string, any>;
} 