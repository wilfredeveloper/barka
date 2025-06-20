export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private enableConsole: boolean;

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
    this.enableConsole = process.env.MCP_ENABLE_CONSOLE_LOGGING !== 'false';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.MCP_LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, data?: any, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private output(logEntry: LogEntry): void {
    if (!this.enableConsole) return;

    const { timestamp, level, message, data, error } = logEntry;
    const prefix = `[${timestamp}] [${level}]`;
    
    if (error) {
      console.error(`${prefix} ${message}`, error);
      if (data) console.error('Data:', data);
    } else if (level === 'ERROR') {
      console.error(`${prefix} ${message}`, data || '');
    } else if (level === 'WARN') {
      console.warn(`${prefix} ${message}`, data || '');
    } else {
      console.log(`${prefix} ${message}`, data || '');
    }
  }

  public error(message: string, error?: Error, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const logEntry = this.formatMessage('ERROR', message, data, error);
      this.output(logEntry);
    }
  }

  public warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const logEntry = this.formatMessage('WARN', message, data);
      this.output(logEntry);
    }
  }

  public info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const logEntry = this.formatMessage('INFO', message, data);
      this.output(logEntry);
    }
  }

  public debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const logEntry = this.formatMessage('DEBUG', message, data);
      this.output(logEntry);
    }
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public setConsoleLogging(enabled: boolean): void {
    this.enableConsole = enabled;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
