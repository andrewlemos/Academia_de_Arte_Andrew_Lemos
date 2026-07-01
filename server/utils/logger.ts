export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  public static info(message: string, context?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  public static warn(message: string, context?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  public static error(message: string, error?: any, context?: any): void {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    const finalContext = { ...context, error: errorDetails };
    console.error(this.formatMessage(LogLevel.ERROR, message, finalContext));
  }

  public static debug(message: string, context?: any): void {
    if (process.env.NODE_ENV !== "production") {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }
}
