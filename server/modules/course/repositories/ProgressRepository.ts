import { firestoreDb } from "../../../config/firebase";
import { StudentProgress } from "../types";

export class ProgressRepository {
  private collection = firestoreDb.collection("progress");
  private static mockDb = new Map<string, StudentProgress>();

  private getDocId(studentId: string, lessonId: string): string {
    return `progress_${studentId}_${lessonId}`;
  }

  public async findByStudentAndLesson(studentId: string, lessonId: string): Promise<StudentProgress | null> {
    const docId = this.getDocId(studentId, lessonId);
    if (process.env.NODE_ENV === "test") {
      const progress = ProgressRepository.mockDb.get(docId);
      return progress ? { ...progress } : null;
    }
    const doc = await this.collection.doc(docId).get();
    if (!doc.exists) return null;
    return doc.data() as StudentProgress;
  }

  public async listAll(): Promise<StudentProgress[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(ProgressRepository.mockDb.values()).map(p => ({ ...p }));
    }
    const snapshot = await this.collection.get();
    const list: StudentProgress[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as StudentProgress);
    });
    return list;
  }

  public async listByStudent(studentId: string): Promise<StudentProgress[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(ProgressRepository.mockDb.values())
        .filter((p) => p.studentId === studentId)
        .map(p => ({ ...p }));
    }
    const snapshot = await this.collection.where("studentId", "==", studentId).get();
    const list: StudentProgress[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as StudentProgress);
    });
    return list;
  }

  public async save(progress: StudentProgress): Promise<StudentProgress> {
    const docId = this.getDocId(progress.studentId, progress.lessonId);
    if (process.env.NODE_ENV === "test") {
      ProgressRepository.mockDb.set(docId, { ...progress });
      return progress;
    }
    await this.collection.doc(docId).set(progress, { merge: true });
    return progress;
  }

  public async update(studentId: string, lessonId: string, data: Partial<StudentProgress>): Promise<StudentProgress> {
    const docId = this.getDocId(studentId, lessonId);
    if (process.env.NODE_ENV === "test") {
      const existing = ProgressRepository.mockDb.get(docId);
      if (!existing) {
        throw new Error(`Progresso do estudante ${studentId} para a aula ${lessonId} não encontrado.`);
      }
      const updated = { ...existing, ...data };
      ProgressRepository.mockDb.set(docId, updated);
      return updated;
    }
    await this.collection.doc(docId).update(data);
    const updated = await this.findByStudentAndLesson(studentId, lessonId);
    if (!updated) {
      throw new Error(`Progresso do estudante ${studentId} para a aula ${lessonId} não encontrado.`);
    }
    return updated;
  }
}
