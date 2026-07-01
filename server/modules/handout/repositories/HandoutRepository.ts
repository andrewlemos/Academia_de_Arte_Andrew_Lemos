import { firestoreDb } from "../../../config/firebase";
import { Handout } from "../types";

export class HandoutRepository {
  private collection = firestoreDb.collection("apostilas");
  private static mockDb = new Map<string, Handout>();

  public async findById(id: string): Promise<Handout | null> {
    if (process.env.NODE_ENV === "test") {
      const handout = HandoutRepository.mockDb.get(id);
      return handout ? { ...handout } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Handout;
  }

  public async listAll(): Promise<Handout[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(HandoutRepository.mockDb.values()).map(h => ({ ...h }));
    }
    const snapshot = await this.collection.get();
    const handouts: Handout[] = [];
    snapshot.forEach((doc) => {
      handouts.push({ id: doc.id, ...doc.data() } as Handout);
    });
    return handouts;
  }

  public async create(handout: Handout): Promise<Handout> {
    if (process.env.NODE_ENV === "test") {
      HandoutRepository.mockDb.set(handout.id, { ...handout });
      return handout;
    }
    await this.collection.doc(handout.id).set(handout);
    return handout;
  }

  public async update(id: string, data: Partial<Handout>): Promise<Handout> {
    if (process.env.NODE_ENV === "test") {
      const existing = HandoutRepository.mockDb.get(id);
      if (!existing) {
        throw new Error(`Apostila com ID ${id} não pôde ser encontrada.`);
      }
      const updated = { ...existing, ...data };
      HandoutRepository.mockDb.set(id, updated);
      return updated;
    }
    await this.collection.doc(id).update(data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Apostila com ID ${id} não pôde ser encontrada.`);
    }
    return updated;
  }

  public async delete(id: string): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      HandoutRepository.mockDb.delete(id);
      return;
    }
    await this.collection.doc(id).delete();
  }
}
