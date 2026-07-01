export interface Sale {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  productId: string;
  productTitle: string;
  productType: "course" | "apostila";
  pricePaid: number;
  couponUsed?: string;
  paymentMethod: "credit_card" | "pix" | "boleto";
  paymentStatus: "approved" | "pending" | "failed";
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  expiresAt: string;
  active: boolean;
}
