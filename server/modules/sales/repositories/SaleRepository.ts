import { firestoreDb } from "../../../config/firebase";
import { Sale } from "../types";

export class SaleRepository {
  private collection = firestoreDb.collection("sales");
  private static mockDb = new Map<string, Sale>();

  public async findById(id: string): Promise<Sale | null> {
    if (process.env.NODE_ENV === "test") {
      const sale = SaleRepository.mockDb.get(id);
      return sale ? { ...sale } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Sale;
  }

  public async listAll(): Promise<Sale[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(SaleRepository.mockDb.values()).map(s => ({ ...s }));
    }
    const snapshot = await this.collection.get();
    const sales: Sale[] = [];
    snapshot.forEach((doc) => {
      sales.push({ id: doc.id, ...doc.data() } as Sale);
    });
    return sales;
  }

  public async create(sale: Sale): Promise<Sale> {
    if (process.env.NODE_ENV === "test") {
      SaleRepository.mockDb.set(sale.id, { ...sale });
      return sale;
    }
    await this.collection.doc(sale.id).set(sale);
    return sale;
  }

  public async update(id: string, data: Partial<Sale>): Promise<Sale> {
    if (process.env.NODE_ENV === "test") {
      const existing = SaleRepository.mockDb.get(id);
      if (!existing) {
        throw new Error(`Venda com ID ${id} não pôde ser encontrada.`);
      }
      const updated = { ...existing, ...data };
      SaleRepository.mockDb.set(id, updated);
      return updated;
    }
    await this.collection.doc(id).update(data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Venda com ID ${id} não pôde ser encontrada.`);
    }
    return updated;
  }
}
