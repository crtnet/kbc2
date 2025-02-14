type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
  timestamp?: boolean;
  level?: LogLevel;
}

class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      timestamp: true,
      level: 'info',
      ...options
    };
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.options.timestamp ? `[${new Date().toISOString()}] ` : '';
    const formattedLevel = level.toUpperCase();
    return `${timestamp}${formattedLevel}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  }

  info(message: string, data?: any) {
    console.log(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: any) {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(message: string, error?: any) {
    console.error(this.formatMessage('error', message, error));
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();