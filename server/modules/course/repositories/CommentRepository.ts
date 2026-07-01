import { firestoreDb } from "../../../config/firebase";
import { SupportComment } from "../types";

export class CommentRepository {
  private collection = firestoreDb.collection("supportComments");
  private static mockDb = new Map<string, SupportComment>();

  public async findById(id: string): Promise<SupportComment | null> {
    if (process.env.NODE_ENV === "test") {
      const comment = CommentRepository.mockDb.get(id);
      return comment ? { ...comment } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SupportComment;
  }

  public async listAll(): Promise<SupportComment[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(CommentRepository.mockDb.values()).map(c => ({ ...c }));
    }
    const snapshot = await this.collection.get();
    const list: SupportComment[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as SupportComment);
    });
    return list;
  }

  public async create(comment: SupportComment): Promise<SupportComment> {
    if (process.env.NODE_ENV === "test") {
      CommentRepository.mockDb.set(comment.id, { ...comment });
      return comment;
    }
    await this.collection.doc(comment.id).set(comment);
    return comment;
  }

  public async update(id: string, data: Partial<SupportComment>): Promise<SupportComment> {
    if (process.env.NODE_ENV === "test") {
      const existing = CommentRepository.mockDb.get(id);
      if (!existing) {
        throw new Error(`Comentário com ID ${id} não pôde ser encontrado.`);
      }
      const updated = { ...existing, ...data };
      CommentRepository.mockDb.set(id, updated);
      return updated;
    }
    await this.collection.doc(id).update(data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Comentário com ID ${id} não pôde ser encontrado.`);
    }
    return updated;
  }

  public async delete(id: string): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      CommentRepository.mockDb.delete(id);
      return;
    }
    await this.collection.doc(id).delete();
  }
}
