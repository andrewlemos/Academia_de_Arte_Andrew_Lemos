import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import { requestLogger } from "./middlewares/logging.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { isProduction, env } from "./config/env";
import apiV1Router from "./routes/v1";
import { Logger } from "./utils/logger";
import { bootstrapDatabase } from "./config/seeder";

export async function bootstrapApp() {
  const app = express();

  // Run Database Seeder for RBAC on startup
  if (process.env.NODE_ENV !== "test") {
    await bootstrapDatabase();
  }

  // Enable CORS (Cross-Origin Resource Sharing)
  app.use(cors());

  // Configure Helmet for basic security headers, bypassing strict CSP in dev to prevent breaking Vite
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
    })
  );

  // Parse incoming JSON requests with rawBody verification support for Stripe webhooks
  app.use(
    express.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Performance logging middleware
  app.use(requestLogger);

  // Mount API v1 router
  app.use("/api/v1", apiV1Router);

  // Vite development middleware OR Production static file serving
  if (process.env.NODE_ENV === "test") {
    Logger.info("Ambiente de testes detectado. Pulando carregamento do Vite Dev Server.");
  } else if (!isProduction) {
    Logger.info("Configurando middleware do Vite para o ambiente de desenvolvimento...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    Logger.info("Configurando arquivos estáticos e fallback do SPA para o ambiente de produção...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler (must be registered AFTER all routes/middlewares)
  app.use(errorHandler);

  return app;
}

export async function startServer() {
  try {
    const app = await bootstrapApp();
    const port = env.PORT;
    
    const server = app.listen(port, "0.0.0.0", () => {
      Logger.info(`Servidor rodando com sucesso na porta ${port} [0.0.0.0]`);
    });

    // Graceful Shutdown implementation to support cloud scale-to-zero / scaling events safely
    const shutdown = (signal: string) => {
      Logger.warn(`Sinal ${signal} recebido. Iniciando encerramento gracioso (graceful shutdown)...`);
      
      server.close(() => {
        Logger.info("Conexões HTTP finalizadas e servidor Express encerrado com sucesso.");
        process.exit(0);
      });

      // Force terminate after 10 seconds if connections are hanging
      setTimeout(() => {
        Logger.error("Timeout de graceful shutdown excedido. Forçando encerramento imediato.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    Logger.error("Falha ao iniciar o servidor express", error);
    process.exit(1);
  }
}

