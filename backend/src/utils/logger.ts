import fs from 'fs';
import path from 'path';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.logFile = path.join(this.logDir, 'app.log');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
  }

  private writeLog(level: LogLevel, message: string, meta?: any) {
    const logMessage = this.formatMessage(level, message, meta);
    
    // Console output
    if (level === 'error') {
      console.error(logMessage.trim());
    } else if (level === 'warn') {
      console.warn(logMessage.trim());
    } else {
      console.log(logMessage.trim());
    }

    // File output (only in production or if LOG_TO_FILE is enabled)
    if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
      fs.appendFileSync(this.logFile, logMessage, 'utf8');
    }
  }

  info(message: string, meta?: any) {
    this.writeLog('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.writeLog('warn', message, meta);
  }

  error(message: string, error?: Error | any) {
    const meta = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    this.writeLog('error', message, meta);
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.writeLog('debug', message, meta);
    }
  }
}

export const logger = new Logger();
export default logger;
