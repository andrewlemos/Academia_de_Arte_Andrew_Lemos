import { verifyFirebaseToken } from "../../../infrastructure/auth/AuthProvider";
import { UserRepository } from "../repositories/UserRepository";
import { RoleRepository } from "../repositories/RoleRepository";
import { User } from "../types";
import { Logger } from "../../../utils/logger";
import { UnauthorizedError } from "../../../utils/errors";

export class AuthService {
  private userRepository = new UserRepository();
  private roleRepository = new RoleRepository();

  /**
   * Verifies a Firebase Auth JWT ID Token.
   * In test environment, simulates JWT verification to allow fast local testing.
   */
  public async verifyToken(token: string): Promise<{ uid: string; email: string; name: string }> {
    if (!token) {
      throw new UnauthorizedError("Token de autenticação não fornecido");
    }

    if (process.env.NODE_ENV === "test") {
      // Simulado para testes automatizados rápidos e robustos
      if (token === "invalid-token" || token.includes("expired")) {
        throw new UnauthorizedError("Token inválido ou expirado");
      }
      if (token.startsWith("test-token:")) {
        const parts = token.split(":");
        const uid = parts[1] || "test-uid";
        const email = parts[2] ? `${parts[2]}@test.com` : "test@test.com";
        const name = parts[3] || "Test User";
        return { uid, email, name };
      }
    }

    try {
      return await verifyFirebaseToken(token);
    } catch (error: any) {
      Logger.warn("Falha ao verificar JWT do Firebase:", { message: error.message });
      throw new UnauthorizedError("Token de autenticação inválido ou expirado");
    }
  }

  /**
   * Synchronizes or registers a Firebase Auth user into the local Firestore users collection.
   */
  public async syncUser(uid: string, email: string, name: string, preferredRoleId?: string): Promise<User> {
    const existingUser = await this.userRepository.findById(uid);
    if (existingUser) {
      // If user status is inactive, prevent synchronization or flag error
      if (existingUser.status === "inactive") {
        throw new UnauthorizedError("Conta de usuário desativada");
      }
      return existingUser;
    }

    // Assign appropriate default roles
    let roleId = "student";
    if (email.toLowerCase().trim() === "andrewfmlemos@gmail.com") {
      roleId = "admin";
    } else if (preferredRoleId) {
      const roleExists = await this.roleRepository.findById(preferredRoleId);
      if (roleExists) {
        roleId = preferredRoleId;
      }
    }

    const newUser: User = {
      id: uid,
      name,
      email: email.toLowerCase().trim(),
      roleId,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Logger.info(`Criando novo perfil de usuário sincronizado via Firebase: ${email} (${roleId})`);
    return await this.userRepository.create(newUser);
  }

  /**
   * List all users.
   */
  public async listAllUsers(): Promise<User[]> {
    return await this.userRepository.listAll();
  }

  /**
   * Find a user by ID.
   */
  public async findUserById(id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  /**
   * Update a user's role.
   */
  public async updateUserRole(id: string, roleId: string): Promise<User> {
    const roleExists = await this.roleRepository.findById(roleId);
    if (!roleExists) {
      throw new Error(`Cargo/Role '${roleId}' não encontrado`);
    }
    return await this.userRepository.update(id, { roleId });
  }

  /**
   * Update a user's status.
   */
  public async updateUserStatus(id: string, status: "active" | "inactive"): Promise<User> {
    return await this.userRepository.update(id, { status });
  }
}
