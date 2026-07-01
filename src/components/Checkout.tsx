import React, { useState, useEffect } from "react";
import { Course, Apostila, Coupon, Sale, User } from "../types";
import { CreditCard, QrCode, Barcode, Sparkles, CheckCircle2, Ticket, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { getDirectDriveUrl } from "../utils/image";
import { apiFetch } from "../utils/firebase";

const fetch = apiFetch;

interface CheckoutProps {
  product?: Course | Apostila;
  productType?: "course" | "apostila";
  cartItems?: { product: Course | Apostila; type: "course" | "apostila" }[];
  currentUser: User;
  onPaymentSuccess: (newSale: Sale) => void;
  onCancel: () => void;
  coupons: Coupon[];
  onClearCart?: () => void;
}

export default function Checkout({
  product,
  productType,
  cartItems = [],
  currentUser,
  onPaymentSuccess,
  onCancel,
  coupons,
  onClearCart,
}: CheckoutProps) {
  // Determine if we are checking out the cart or a single direct product
  const itemsToBuy = cartItems.length > 0 
    ? cartItems 
    : (product && productType ? [{ product, type: productType }] : []);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  
  // Choice of provider: 'stripe' or 'mercadopago'
  const [gatewayProvider, setGatewayProvider] = useState<"stripe" | "mercadopago">("mercadopago");
  
  // Specific method to tell the gateways: 'credit_card', 'pix' or 'boleto'
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix" | "boleto">("pix");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
  });

  // Calculate totals from items list
  const subtotal = itemsToBuy.reduce((acc, item) => acc + item.product.price, 0);
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  const finalPrice = subtotal - discountAmount;

  // Auto-set gateway provider recommendation
  useEffect(() => {
    if (paymentMethod === "credit_card") {
      setGatewayProvider("stripe"); // Stripe is world class for card
    } else {
      setGatewayProvider("mercadopago"); // Mercado Pago is local king of Pix/Boleto
    }
  }, [paymentMethod]);

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

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setCheckoutError("");

    if (itemsToBuy.length === 0) {
      setCheckoutError("Nenhum item selecionado para compra.");
      setIsProcessing(false);
      return;
    }

    const payload = {
      studentId: currentUser?.id || `user_student_${Date.now()}`,
      studentName: formData.name,
      studentEmail: formData.email,
      cartItems: itemsToBuy.map((item) => ({ id: item.product.id, type: item.type })),
      couponCode: appliedCoupon?.code || undefined,
    };

    try {
      // Direct integration with Stripe or Mercado Pago backend routing
      const endpoint = gatewayProvider === "stripe" 
        ? "/api/v1/sales/checkout/stripe" 
        : "/api/v1/sales/checkout/mercadopago";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // Redireciona para o checkout oficial seguro e criptografado da Stripe ou Mercado Pago
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || "Falha ao iniciar transação no gateway de pagamentos.");
      }
    } catch (err: any) {
      console.error("Erro no processamento do checkout:", err);
      setCheckoutError(err.message || "Erro de conexão ao servidor de pagamentos.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="checkout-main-container">
      {/* Back navigation header */}
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-brand-clay hover:text-brand-wood font-medium text-sm transition-colors font-sans"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Billing Details Form */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-brand-wood/10 shadow-sm space-y-6">
          <h2 className="text-xl font-serif font-bold text-brand-ink">Dados de Faturamento</h2>

          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            {/* User Identification info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-clay uppercase tracking-widest">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-2.5 rounded-full border border-brand-wood/20 text-sm focus:outline-none focus:ring-2 focus:ring-brand-wood/10 focus:border-brand-wood transition-all bg-brand-paper/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-clay uppercase tracking-widest">E-mail</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Seu melhor e-mail para acesso"
                  className="w-full px-4 py-2.5 rounded-full border border-brand-wood/20 text-sm focus:outline-none focus:ring-2 focus:ring-brand-wood/10 focus:border-brand-wood transition-all bg-brand-paper/50"
                />
              </div>
            </div>

            {/* Selection of Payment Option */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-brand-clay uppercase tracking-widest block">
                Método de Pagamento Preferencial
              </span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === "pix"
                      ? "border-brand-wood bg-brand-paper text-brand-wood font-bold"
                      : "border-brand-wood/10 text-brand-clay hover:bg-brand-paper"
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs">Pix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("credit_card")}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === "credit_card"
                      ? "border-brand-wood bg-brand-paper text-brand-wood font-bold"
                      : "border-brand-wood/10 text-brand-clay hover:bg-brand-paper"
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Cartão</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("boleto")}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === "boleto"
                      ? "border-brand-wood bg-brand-paper text-brand-wood font-bold"
                      : "border-brand-wood/10 text-brand-clay hover:bg-brand-paper"
                  }`}
                >
                  <Barcode className="w-5 h-5" />
                  <span className="text-xs">Boleto</span>
                </button>
              </div>
            </div>

            {/* Selection of Gateway Integrator */}
            <div className="space-y-2.5 pt-1">
              <span className="text-[10px] font-bold text-brand-clay uppercase tracking-widest block">
                Processador de Pagamento Seguro
              </span>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                    gatewayProvider === "mercadopago"
                      ? "border-brand-wood bg-brand-paper/50 text-brand-wood font-bold"
                      : "border-brand-wood/10 text-brand-clay hover:bg-brand-paper/35"
                  }`}
                >
                  <input
                    type="radio"
                    name="gateway"
                    value="mercadopago"
                    checked={gatewayProvider === "mercadopago"}
                    onChange={() => setGatewayProvider("mercadopago")}
                    className="accent-brand-wood"
                  />
                  <div className="text-left">
                    <span className="text-xs block font-bold">Mercado Pago</span>
                    <span className="text-[9px] text-brand-clay block leading-none">Pix, Boleto e Cartão local</span>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                    gatewayProvider === "stripe"
                      ? "border-brand-wood bg-brand-paper/50 text-brand-wood font-bold"
                      : "border-brand-wood/10 text-brand-clay hover:bg-brand-paper/35"
                  }`}
                >
                  <input
                    type="radio"
                    name="gateway"
                    value="stripe"
                    checked={gatewayProvider === "stripe"}
                    onChange={() => setGatewayProvider("stripe")}
                    className="accent-brand-wood"
                  />
                  <div className="text-left">
                    <span className="text-xs block font-bold">Stripe Payments</span>
                    <span className="text-[9px] text-brand-clay block leading-none">Cartões internacionais em 1-clique</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Error Message */}
            {checkoutError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-900 text-xs rounded-2xl font-medium">
                {checkoutError}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-brand-wood hover:bg-brand-clay text-white rounded-full text-sm font-sans font-medium shadow-lg shadow-brand-wood/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Conectando ao Gateway Seguro...
                </>
              ) : (
                `Finalizar Pedido - R$ ${finalPrice},00`
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Cart Summary & Coupon Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-brand-wood/10 shadow-sm space-y-5">
            <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">Resumo da Compra</h3>

            {/* Products loop */}
            <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
              {itemsToBuy.map((item) => (
                <div key={item.product.id} className="flex gap-4 border-b border-brand-wood/5 pb-3 last:border-0 last:pb-0">
                  <div className="w-16 h-20 bg-brand-paper rounded-2xl overflow-hidden flex-shrink-0 border border-brand-wood/10">
                    <img
                      src={getDirectDriveUrl(item.product.coverUrl)}
                      alt={item.product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[8px] bg-brand-clay/10 text-brand-wood font-sans font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {item.type === "course" ? "Curso da Academia" : "Apostila Técnica"}
                    </span>
                    <h4 className="text-xs font-serif font-semibold text-[#1A1A1A] line-clamp-2 leading-tight">
                      {item.product.title}
                    </h4>
                    <span className="font-mono text-xs text-brand-clay">R$ {item.product.price},00</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupons Form */}
            <div className="pt-4 border-t border-brand-wood/10 space-y-3">
              <label className="text-[10px] font-sans font-bold text-[#8B5E3C] uppercase tracking-widest block">
                Cupom de Desconto
              </label>
              {appliedCoupon ? (
                <div className="bg-brand-paper text-brand-wood border border-brand-wood/20 rounded-2xl px-4 py-2.5 flex justify-between items-center text-xs">
                  <span className="font-semibold flex items-center gap-1.5 uppercase tracking-wide">
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
                    className="flex-1 px-4 py-2.5 rounded-full border border-brand-wood/20 text-xs focus:outline-none focus:ring-1 focus:ring-brand-wood/30 bg-brand-paper/30"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-brand-wood hover:bg-brand-clay text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-all"
                  >
                    Aplicar
                  </button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-red-600 font-semibold">{couponError}</p>}
              {!appliedCoupon && (
                <div className="flex gap-2 flex-wrap pt-1 text-[10px] text-brand-clay/70">
                  <span>Dicas:</span>
                  <button
                    onClick={() => {
                      setCouponCode("BLACKFRIDAY50");
                    }}
                    className="hover:text-brand-wood font-medium hover:underline bg-brand-paper px-2 py-0.5 rounded-full border border-brand-wood/10"
                  >
                    BLACKFRIDAY50 (50%)
                  </button>
                  <button
                    onClick={() => {
                      setCouponCode("PROMO20");
                    }}
                    className="hover:text-brand-wood font-medium hover:underline bg-brand-paper px-2 py-0.5 rounded-full border border-brand-wood/10"
                  >
                    PROMO20 (20%)
                  </button>
                </div>
              )}
            </div>

            {/* Calculations and prices invoice structure */}
            <div className="pt-4 border-t border-brand-wood/10 space-y-2 text-sm text-brand-clay">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span>R$ {subtotal},00</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between items-center text-brand-wood font-medium">
                  <span>Desconto ({appliedCoupon.discountPercent}%)</span>
                  <span>-R$ {discountAmount},00</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-brand-wood/10 font-serif font-bold text-[#1A1A1A] text-lg">
                <span>Total</span>
                <span>R$ {finalPrice},00</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#4A3222] to-[#2F1F15] text-[#DFD3C3] p-5 rounded-3xl border border-brand-wood/10 shadow-md space-y-3.5">
            <span className="inline-flex items-center gap-1 bg-brand-clay/20 text-[#DFD3C3] border border-brand-clay/30 px-2.5 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-brand-clay" /> Certificação Ateliê de Artes
            </span>
            <p className="text-[#DFD3C3]/80 text-xs leading-relaxed font-sans font-light">
              Nossa academia garante visualização exclusiva de cursos e infoprodutos protegidos de artes plásticas. Seus materiais e apostilas são protegidos e associados diretamente à sua conta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
