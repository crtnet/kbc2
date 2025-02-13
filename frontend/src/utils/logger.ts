type LogLevel = 'info' | 'warn' | 'error';

interface LogMessage {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: any): LogMessage {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  private log(logMessage: LogMessage) {
    const { level, message, data, timestamp } = logMessage;
    const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'info':
        console.log(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }
  }

  info(message: string, data?: any) {
    this.log(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: any) {
    this.log(this.formatMessage('warn', message, data));
  }

  error(message: string, data?: any) {
    this.log(this.formatMessage('error', message, data));
  }
}

export const logger = new Logger();