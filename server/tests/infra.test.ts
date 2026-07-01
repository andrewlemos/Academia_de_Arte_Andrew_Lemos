process.env.NODE_ENV = "test";
import { env, isProduction } from "../config/env";
import { Logger } from "../utils/logger";
import { AppError, BadRequestError, UnauthorizedError, NotFoundError } from "../utils/errors";
import { firestoreDb } from "../config/firebase";
import { bootstrapApp } from "../app";

async function runTests() {
  Logger.info("========================================");
  Logger.info(" INICIANDO TESTES DE INFRAESTRUTURA (FASE 0) ");
  Logger.info("========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      Logger.info(`✔ PASSED: ${testName}`);
      passed++;
    } else {
      Logger.error(`❌ FAILED: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Env & Config Validation
    assert(typeof env.PORT === "number", "Variável PORT deve ser numérica");
    assert(env.NODE_ENV !== undefined, "Variável NODE_ENV deve estar definida");
    assert(isProduction === false || isProduction === true, "isProduction deve ser um booleano");

    // Test 2: Custom Error Handler & Types
    const err400 = new BadRequestError("Dados incorretos");
    assert(err400 instanceof AppError, "BadRequestError deve herdar de AppError");
    assert(err400.statusCode === 400, "BadRequestError deve ter código HTTP 400");
    assert(err400.message === "Dados incorretos", "BadRequestError deve manter a mensagem personalizada");

    const err401 = new UnauthorizedError();
    assert(err401.statusCode === 401, "UnauthorizedError deve ter código HTTP 401");

    const err404 = new NotFoundError();
    assert(err404.statusCode === 404, "NotFoundError deve ter código HTTP 404");

    // Test 3: Logger Utility
    Logger.info("Testando log informativo (sucesso)");
    Logger.warn("Testando log de aviso (sucesso)");
    Logger.debug("Testando log de debug (sucesso)");

    // Test 4: Firebase Admin SDK & Firestore Connection
    assert(firestoreDb !== undefined, "A instância firestoreDb deve ser exportada com sucesso");
    assert(typeof firestoreDb.collection === "function", "firestoreDb deve possuir o método collection para query");

    // Test 5: Express App Bootstrap
    const app = await bootstrapApp();
    assert(typeof app === "function", "O bootstrapApp deve retornar uma função executável Express");

    Logger.info("========================================");
    Logger.info(` RESUMO DOS TESTES: ${passed} passaram, ${failed} falharam.`);
    Logger.info("========================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    Logger.error("Erro fatal durante a execução dos testes de infraestrutura", error);
    process.exit(1);
  }
}

// Executa os testes se este arquivo for chamado diretamente
runTests();
