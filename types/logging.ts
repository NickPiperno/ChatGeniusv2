export interface BaseLog {
  timestamp?: string;
  level?: string;
  message: string;
  [key: string]: any;
} 