import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Logger } from "../../utils/logger";

let isAuthInitialized = false;

function ensureAuthInitialized() {
  if (isAuthInitialized) return;
  try {
    if (getApps().length === 0) {
      initializeApp({
        projectId: "gen-lang-client-0853696923"
      });
    }
    isAuthInitialized = true;
    Logger.info("[AuthProvider] Firebase Admin SDK inicializado para Autenticação (JWT).");
  } catch (error: any) {
    Logger.error("[AuthProvider] Erro ao inicializar Firebase Admin para Autenticação:", error);
  }
}

export async function verifyFirebaseToken(token: string): Promise<{ uid: string; email: string; name: string }> {
  ensureAuthInitialized();
  const decodedToken = await getAuth().verifyIdToken(token);
  return {
    uid: decodedToken.uid,
    email: decodedToken.email || "",
    name: decodedToken.name || decodedToken.email?.split("@")[0] || "Aluno",
  };
}
