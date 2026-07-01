import { firestoreDb } from "../../../config/firebase";
import { User } from "../types";

export class UserRepository {
  private collection = firestoreDb.collection("users");
  private static mockDb = new Map<string, User>();

  public async findById(id: string): Promise<User | null> {
    if (process.env.NODE_ENV === "test") {
      const user = UserRepository.mockDb.get(id);
      return user ? { ...user } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as User;
  }

  public async findByEmail(email: string): Promise<User | null> {
    if (process.env.NODE_ENV === "test") {
      const targetEmail = email.toLowerCase().trim();
      for (const user of UserRepository.mockDb.values()) {
        if (user.email.toLowerCase().trim() === targetEmail) {
          return { ...user };
        }
      }
      return null;
    }
    const query = await this.collection.where("email", "==", email.toLowerCase().trim()).get();
    if (query.empty) {
      return null;
    }
    const doc = query.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  public async create(user: User): Promise<User> {
    if (process.env.NODE_ENV === "test") {
      UserRepository.mockDb.set(user.id, { ...user });
      return user;
    }
    await this.collection.doc(user.id).set({
      name: user.name,
      email: user.email.toLowerCase().trim(),
      roleId: user.roleId,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    return user;
  }

  public async update(id: string, user: Partial<User>): Promise<User> {
    if (process.env.NODE_ENV === "test") {
      const existing = UserRepository.mockDb.get(id);
      if (!existing) {
        throw new Error(`Usuário ${id} não pôde ser encontrado após atualização`);
      }
      const updatedUser = {
        ...existing,
        ...user,
        updatedAt: new Date().toISOString(),
      };
      UserRepository.mockDb.set(id, updatedUser);
      return updatedUser;
    }
    const updatedUser = {
      ...user,
      updatedAt: new Date().toISOString(),
    };
    await this.collection.doc(id).update(updatedUser);
    const doc = await this.findById(id);
    if (!doc) {
      throw new Error(`Usuário ${id} não pôde ser encontrado após atualização`);
    }
    return doc;
  }

  public async listAll(): Promise<User[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(UserRepository.mockDb.values()).map(u => ({ ...u }));
    }
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User));
  }

  public async delete(id: string): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      UserRepository.mockDb.delete(id);
      return;
    }
    await this.collection.doc(id).delete();
  }
}
