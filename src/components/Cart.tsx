import React, { useState, useEffect } from "react";
import { Course, Apostila, Coupon } from "../types";
import { X, Trash2, ShoppingBag, ArrowRight, Ticket } from "lucide-react";
import { getDirectDriveUrl } from "../utils/image";

interface CartItem {
  product: Course | Apostila;
  type: "course" | "apostila";
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveFromCart: (id: string) => void;
  onCheckout: () => void;
  coupons: Coupon[];
}

export default function Cart({
  isOpen,
  onClose,
  cartItems,
  onRemoveFromCart,
  onCheckout,
  coupons,
}: CartProps) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price, 0);
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  const finalTotal = subtotal - discountAmount;

  useEffect(() => {
    // Reset coupon if cart is empty
    if (cartItems.length === 0) {
      setAppliedCoupon(null);
    }
  }, [cartItems]);

  if (!isOpen) return null;

  const handleApplyCoupon = () => {
    setCouponError("");
    const code = couponCode.trim().toUpperCase();
    const found = coupons.find((c) => c.code === code && c.active);

    if (found) {
      setAppliedCoupon(found);
    } else {
      setCouponError("Cupom inválido, expirado ou inativo.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-container">
      {/* Overlay Backdrop */}
      <div className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FDFCFB] border-l border-brand-wood/15 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b border-brand-wood/10 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-wood" />
              <h2 className="font-serif font-bold text-brand-ink text-base">Seu Carrinho</h2>
              <span className="bg-brand-wood/10 text-brand-wood font-sans font-bold text-[10px] px-2 py-0.5 rounded-full">
                {cartItems.length} {cartItems.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <button onClick={onClose} className="p-1 rounded-full text-brand-clay hover:text-brand-ink hover:bg-brand-wood/5 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <ShoppingBag className="w-12 h-12 text-brand-clay/30" />
                <div>
                  <h3 className="font-serif font-bold text-brand-ink text-sm">Seu carrinho está vazio</h3>
                  <p className="text-brand-clay text-xs font-sans max-w-xs mt-1">
                    Navegue pelas nossas coleções de cursos teóricos, práticos e apostilas detalhadas.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-brand-wood hover:bg-brand-clay text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Continuar Comprando
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="bg-white p-4 rounded-2xl border border-brand-wood/5 hover:border-brand-wood/15 hover:shadow-sm transition-all flex gap-4 relative group"
                  >
                    <img
                      src={getDirectDriveUrl(item.product.coverUrl)}
                      alt={item.product.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-20 object-cover rounded-xl border border-brand-wood/5 flex-shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div>
                        <span className="text-[8px] tracking-wider uppercase bg-brand-clay/10 text-brand-wood font-bold px-2 py-0.5 rounded-full inline-block">
                          {item.type === "course" ? "Curso Premium" : "Apostila Digital"}
                        </span>
                        <h4 className="font-serif font-bold text-brand-ink text-xs line-clamp-2 mt-1 pr-6 leading-tight">
                          {item.product.title}
                        </h4>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="font-serif font-bold text-brand-wood text-sm">
                          R$ {item.product.price},00
                        </span>
                      </div>
                    </div>
                    {/* Delete item button */}
                    <button
                      onClick={() => onRemoveFromCart(item.product.id)}
                      className="absolute top-4 right-4 text-brand-clay/50 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-all"
                      title="Remover do carrinho"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer invoice details and checkout */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-brand-wood/10 bg-white space-y-4">
              {/* Promo Coupon Form */}
              <div className="space-y-2">
                <span className="text-[9px] font-sans font-bold text-[#8B5E3C] uppercase tracking-widest block">
                  Código de Cupom
                </span>
                {appliedCoupon ? (
                  <div className="bg-brand-paper text-brand-wood border border-brand-wood/25 rounded-xl px-4 py-2 flex justify-between items-center text-xs">
                    <span className="font-semibold flex items-center gap-1.5 uppercase">
                      <Ticket className="w-4 h-4 text-brand-clay" /> {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)
                    </span>
                    <button onClick={handleRemoveCoupon} className="text-brand-clay hover:text-brand-wood font-bold">
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Ex: BLACKFRIDAY50"
                      className="flex-1 px-4 py-2 text-xs rounded-full border border-brand-wood/20 focus:outline-none focus:ring-1 focus:ring-brand-wood/30 bg-brand-paper/20"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="bg-brand-wood hover:bg-brand-clay text-white text-xs font-semibold px-4 py-2 rounded-full transition-all"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
                {couponError && <p className="text-[10px] text-red-600 font-semibold">{couponError}</p>}
              </div>

              {/* Totals table */}
              <div className="space-y-2 text-xs text-brand-clay pt-2 border-t border-brand-wood/5">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R$ {subtotal},00</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-brand-wood font-medium">
                    <span>Desconto ({appliedCoupon.discountPercent}%)</span>
                    <span>-R$ {discountAmount},00</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-brand-wood/10 font-serif font-bold text-brand-ink text-base">
                  <span>Total estimado</span>
                  <span>R$ {finalTotal},00</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => {
                  onClose();
                  onCheckout();
                }}
                className="w-full py-4 bg-brand-wood hover:bg-brand-clay text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Prosseguir para Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
