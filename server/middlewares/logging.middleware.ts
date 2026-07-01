import { Request, Response, NextFunction } from "express";
import { Logger } from "../utils/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const logMsg = `[${method}] ${originalUrl} - Status: ${statusCode} (${duration}ms) - IP: ${ip}`;

    if (statusCode >= 500) {
      Logger.error(`Falha no servidor: ${logMsg}`);
    } else if (statusCode >= 400) {
      Logger.warn(`Aviso de requisição: ${logMsg}`);
    } else {
      Logger.info(logMsg);
    }
  });

  next();
}
