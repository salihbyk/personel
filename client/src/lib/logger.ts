type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, error?: Error, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      error,
      context,
    };

    console[level](
      `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
      error ? error : '',
      context ? context : ''
    );

    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, undefined, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, undefined, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, error, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
