import { firestoreDb } from "../../../config/firebase";
import { Lesson } from "../types";

export class LessonRepository {
  private collection = firestoreDb.collection("lessons");
  private static mockDb = new Map<string, Lesson>();

  public async findById(id: string): Promise<Lesson | null> {
    if (process.env.NODE_ENV === "test") {
      const lesson = LessonRepository.mockDb.get(id);
      return lesson ? { ...lesson } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Lesson;
  }

  public async listAll(): Promise<Lesson[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(LessonRepository.mockDb.values()).map(l => ({ ...l }));
    }
    const snapshot = await this.collection.get();
    const lessons: Lesson[] = [];
    snapshot.forEach((doc) => {
      lessons.push({ id: doc.id, ...doc.data() } as Lesson);
    });
    return lessons;
  }

  public async listByModuleId(moduleId: string): Promise<Lesson[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(LessonRepository.mockDb.values())
        .filter((l) => l.moduleId === moduleId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(l => ({ ...l }));
    }
    const snapshot = await this.collection.where("moduleId", "==", moduleId).get();
    const lessons: Lesson[] = [];
    snapshot.forEach((doc) => {
      lessons.push({ id: doc.id, ...doc.data() } as Lesson);
    });
    return lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public async listByCourseId(courseId: string): Promise<Lesson[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(LessonRepository.mockDb.values())
        .filter((l) => l.courseId === courseId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(l => ({ ...l }));
    }
    const snapshot = await this.collection.where("courseId", "==", courseId).get();
    const lessons: Lesson[] = [];
    snapshot.forEach((doc) => {
      lessons.push({ id: doc.id, ...doc.data() } as Lesson);
    });
    return lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public async create(lesson: Lesson): Promise<Lesson> {
    if (process.env.NODE_ENV === "test") {
      LessonRepository.mockDb.set(lesson.id, { ...lesson });
      return lesson;
    }
    await this.collection.doc(lesson.id).set(lesson);
    return lesson;
  }

  public async update(id: string, data: Partial<Lesson>): Promise<Lesson> {
    if (process.env.NODE_ENV === "test") {
      const existing = LessonRepository.mockDb.get(id);
      if (!existing) {
        throw new Error(`Aula com ID ${id} não pôde ser encontrada após a atualização.`);
      }
      const updated = { ...existing, ...data };
      LessonRepository.mockDb.set(id, updated);
      return updated;
    }
    await this.collection.doc(id).update(data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Aula com ID ${id} não pôde ser encontrada após a atualização.`);
    }
    return updated;
  }

  public async delete(id: string): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      LessonRepository.mockDb.delete(id);
      return;
    }
    await this.collection.doc(id).delete();
  }
}
