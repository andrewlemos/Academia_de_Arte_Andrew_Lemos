import { firestoreDb } from "../../../config/firebase";
import { Module } from "../types";

export class ModuleRepository {
  private collection = firestoreDb.collection("modules");
  private static mockDb = new Map<string, Module>();

  public async findById(id: string): Promise<Module | null> {
    if (process.env.NODE_ENV === "test") {
      const mod = ModuleRepository.mockDb.get(id);
      return mod ? { ...mod } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Module;
  }

  public async listAll(): Promise<Module[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(ModuleRepository.mockDb.values()).map(m => ({ ...m }));
    }
    const snapshot = await this.collection.get();
    const modules: Module[] = [];
    snapshot.forEach((doc) => {
      modules.push({ id: doc.id, ...doc.data() } as Module);
    });
    return modules;
  }

  public async listByCourseId(courseId: string): Promise<Module[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(ModuleRepository.mockDb.values())
        .filter((m) => m.courseId === courseId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(m => ({ ...m }));
    }
    const snapshot = await this.collection.where("courseId", "==", courseId).get();
    const modules: Module[] = [];
    snapshot.forEach((doc) => {
      modules.push({ id: doc.id, ...doc.data() } as Module);
    });
    return modules.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public async create(module: Module): Promise<Module> {
    if (process.env.NODE_ENV === "test") {
      ModuleRepository.mockDb.set(module.id, { ...module });
      return module;
    }
    await this.collection.doc(module.id).set(module);
    return module;
  }

  public async update(id: string, data: Partial<Module>): Promise<Module> {
    if (process.env.NODE_ENV === "test") {
      const existing = ModuleRepository.mockDb.get(id);
      if (!existing) {
        throw new Error(`Módulo com ID ${id} não pôde ser encontrado após a atualização.`);
      }
      const updated = { ...existing, ...data };
      ModuleRepository.mockDb.set(id, updated);
      return updated;
    }
    await this.collection.doc(id).update(data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Módulo com ID ${id} não pôde ser encontrado após a atualização.`);
    }
    return updated;
  }

  public async delete(id: string): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      ModuleRepository.mockDb.delete(id);
      return;
    }
    await this.collection.doc(id).delete();
  }
}
