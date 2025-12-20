// src/lib/logger.ts

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private logLevels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };
  private currentLogLevel: number;

  private constructor() {
    // Default to 'info' level in production, 'debug' in development
    this.currentLogLevel = this.logLevels[
      process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    ];
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] <= this.currentLogLevel;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  public error(message: string, error?: any, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    
    let errorDetails = '';
    if (error) {
      errorDetails = error instanceof Error 
        ? `\nError: ${error.message}\nStack: ${error.stack}`
        : `\nError: ${JSON.stringify(error)}`;
    }
    
    console.error(this.formatMessage('error', message + errorDetails, context));
  }

  public warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message, context));
  }

  public info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    console.info(this.formatMessage('info', message, context));
  }

  public debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    console.debug(this.formatMessage('debug', message, context));
  }
}

export const logger = Logger.getInstance();
