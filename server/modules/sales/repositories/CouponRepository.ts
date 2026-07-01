import { firestoreDb } from "../../../config/firebase";
import { Coupon } from "../types";

export class CouponRepository {
  private collection = firestoreDb.collection("coupons");
  private static mockDb = new Map<string, Coupon>();

  public async findById(id: string): Promise<Coupon | null> {
    if (process.env.NODE_ENV === "test") {
      const coupon = CouponRepository.mockDb.get(id);
      return coupon ? { ...coupon } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Coupon;
  }

  public async listAll(): Promise<Coupon[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(CouponRepository.mockDb.values()).map(c => ({ ...c }));
    }
    const snapshot = await this.collection.get();
    const coupons: Coupon[] = [];
    snapshot.forEach((doc) => {
      coupons.push({ id: doc.id, ...doc.data() } as Coupon);
    });
    return coupons;
  }

  public async create(coupon: Coupon): Promise<Coupon> {
    if (process.env.NODE_ENV === "test") {
      CouponRepository.mockDb.set(coupon.id, { ...coupon });
      return coupon;
    }
    await this.collection.doc(coupon.id).set(coupon);
    return coupon;
  }

  public async delete(id: string): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      CouponRepository.mockDb.delete(id);
      return;
    }
    await this.collection.doc(id).delete();
  }
}
