import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors";
import { Logger } from "../utils/logger";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Erro interno do servidor";
  let details: any = undefined;

  // Handle known application operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } 
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Erro de validação dos dados de entrada";
    details = err.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
  }

  // Log error using centralized Logger
  if (statusCode >= 500) {
    Logger.error(`Erro crítico no endpoint [${req.method}] ${req.path}`, err, {
      ip: req.ip,
      body: req.body,
      query: req.query,
    });
  } else {
    Logger.warn(`Erro operacional no endpoint [${req.method}] ${req.path}: ${message}`, {
      statusCode,
      details,
    });
  }

  // Return formatted JSON response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
    },
  });
};
