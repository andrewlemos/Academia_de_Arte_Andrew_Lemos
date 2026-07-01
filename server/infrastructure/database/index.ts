import { IDatabaseProvider } from "./DatabaseProvider";
import { FirestoreClientProvider } from "./FirestoreClientProvider";
import { FirestoreAdminProvider } from "./FirestoreAdminProvider";
import { Logger } from "../../utils/logger";

let activeProvider: IDatabaseProvider;

export function initializeDatabase(): IDatabaseProvider {
  if (activeProvider) return activeProvider;

  // Cloud Run or custom env overrides will trigger FirestoreAdminProvider.
  // AI Studio (development) defaults to FirestoreClientProvider.
  const isProduction = process.env.NODE_ENV === "production";
  const useAdminOverride = process.env.USE_FIREBASE_ADMIN === "true";

  if (isProduction || useAdminOverride) {
    Logger.info("[Database] Inicializando FirestoreAdminProvider (Firebase Admin SDK)...");
    activeProvider = new FirestoreAdminProvider();
  } else {
    Logger.info("[Database] Inicializando FirestoreClientProvider (Firebase Client SDK para Sandbox)...");
    activeProvider = new FirestoreClientProvider();
  }

  return activeProvider;
}

export function getDatabaseProvider(): IDatabaseProvider {
  if (!activeProvider) {
    return initializeDatabase();
  }
  return activeProvider;
}

export * from "./DatabaseProvider";
