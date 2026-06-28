import React, { useState } from 'react';
import { Course, Apostila, Coupon, Sale, User } from '../types';
import { CreditCard, QrCode, Barcode, Sparkles, CheckCircle2, Ticket, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getDirectDriveUrl } from '../utils/image';

interface CheckoutProps {
  product: Course | Apostila;
  productType: 'course' | 'apostila';
  currentUser: User;
  onPaymentSuccess: (newSale: Sale) => void;
  onCancel: () => void;
  coupons: Coupon[];
}

export default function Checkout({
  product,
  productType,
  currentUser,
  onPaymentSuccess,
  onCancel,
  coupons
}: CheckoutProps) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'boleto'>('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successState, setSuccessState] = useState<Sale | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    cardNumber: '4111 2222 3333 4444',
    cardName: currentUser?.name?.toUpperCase() || 'ANDREW LEMOS',
    cardExpiry: '12/31',
    cardCvv: '123'
  });

  const basePrice = product.price;
  const discountAmount = appliedCoupon ? (basePrice * appliedCoupon.discountPercent) / 100 : 0;
  const finalPrice = basePrice - discountAmount;

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    const found = coupons.find(c => c.code === code && c.active);
    
    if (found) {
      setAppliedCoupon(found);
    } else {
      setCouponError('Cupom inválido, expirado ou inativo.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate backend response delay
    await new Promise(resolve => setTimeout(resolve, 1800));

    const salePayload: Partial<Sale> = {
      studentId: currentUser?.id || `user_student_${Date.now()}`,
      studentName: formData.name,
      studentEmail: formData.email,
      productId: product.id,
      productTitle: product.title,
      productType: productType,
      pricePaid: finalPrice,
      couponUsed: appliedCoupon?.code || '',
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'boleto' ? 'pending' : 'approved'
    };

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });
      const data = await response.json();
      if (data.success) {
        setSuccessState(data.sale);
      }
    } catch (err) {
      console.error('Erro na requisição do checkout:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rendering Checkout Success Screen
  if (successState) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-brand-wood/10 shadow-xl text-center space-y-6" id="checkout-success-view">
        <div className="w-16 h-16 bg-brand-clay/10 text-brand-wood rounded-full flex items-center justify-center mx-auto border border-brand-clay/20">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-brand-ink">Inscrição Confirmada!</h2>
          <p className="text-brand-clay text-sm font-sans">
            {successState.paymentStatus === 'approved' 
              ? 'Seu acesso imediato já está disponível na sua biblioteca do Aluno.'
              : 'Seu boleto foi gerado e aguarda compensação bancária.'}
          </p>
        </div>

        <div className="bg-brand-paper rounded-2xl p-5 text-left border border-brand-wood/5 space-y-3.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-brand-clay uppercase font-bold tracking-wider text-[10px]">Transação</span>
            <span className="text-brand-ink font-mono font-semibold">{successState.id}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-brand-clay uppercase font-bold tracking-wider text-[10px]">Produto</span>
            <span className="text-brand-ink font-serif font-bold truncate max-w-[200px]">{successState.productTitle}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-brand-clay uppercase font-bold tracking-wider text-[10px]">Valor Pago</span>
            <span className="text-brand-wood font-serif font-bold text-base">R$ {successState.pricePaid},00</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-brand-clay uppercase font-bold tracking-wider text-[10px]">Status do Pagamento</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              successState.paymentStatus === 'approved' 
                ? 'bg-brand-wood/10 text-brand-wood' 
                : 'bg-brand-clay/10 text-brand-clay'
            }`}>
              {successState.paymentStatus === 'approved' ? 'Aprovado' : 'Aguardando Compensação'}
            </span>
          </div>
        </div>

        {paymentMethod === 'pix' && (
          <div className="bg-brand-paper rounded-2xl p-5 border border-brand-wood/10 text-center space-y-3">
            <span className="text-xs text-brand-wood font-sans font-bold block uppercase tracking-widest">Pix Copia e Cola</span>
            <code className="text-[10px] block p-3 bg-brand-ink text-[#F6EFEA] rounded-xl break-all select-all select-none">
              00020101021226870014BR.GOV.BCB.PIX2565pix.andrewlemos.com/lms/sale_{Date.now()}5204000053039865802BR5912Andrew_Lemos6009Sao_Paulo62070503LMS
            </code>
            <p className="text-[10px] text-brand-clay">Efetue o pagamento simulado para ativar instantaneamente.</p>
          </div>
        )}

        {paymentMethod === 'boleto' && (
          <div className="bg-brand-paper rounded-2xl p-5 border border-brand-wood/10 text-center space-y-3">
            <span className="text-xs text-brand-wood font-sans font-bold block uppercase tracking-widest">Código de Barras</span>
            <code className="text-[11px] block p-3 bg-brand-ink text-brand-clay rounded-xl tracking-wider">
              34191.79001 01043.513184 91020.150008 7 987200000{finalPrice}00
            </code>
            <button 
              onClick={() => window.open('#', '_blank')}
              className="inline-flex items-center gap-1.5 text-xs text-brand-wood font-bold hover:underline"
            >
              <Barcode className="w-4 h-4" /> Baixar PDF do Boleto
            </button>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={() => onPaymentSuccess(successState)}
            className="w-full py-3.5 bg-brand-wood hover:bg-brand-clay text-[#FDFCFB] rounded-full text-sm font-sans font-medium shadow-md transition-all uppercase tracking-widest"
          >
            Acessar Área do Aluno
          </button>
        </div>
      </div>
    );
  }

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
        {/* Left Side: Payment Methods Form */}
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
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Seu melhor e-mail para acesso"
                  className="w-full px-4 py-2.5 rounded-full border border-brand-wood/20 text-sm focus:outline-none focus:ring-2 focus:ring-brand-wood/10 focus:border-brand-wood transition-all bg-brand-paper/50"
                />
              </div>
            </div>

            {/* Selector of payment option */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-brand-clay uppercase tracking-widest block">Método de Pagamento</span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'credit_card'
                      ? 'border-brand-wood bg-brand-paper text-brand-wood font-bold'
                      : 'border-brand-wood/10 text-brand-clay hover:bg-brand-paper'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Cartão</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'pix'
                      ? 'border-brand-wood bg-brand-paper text-brand-wood font-bold'
                      : 'border-brand-wood/10 text-brand-clay hover:bg-brand-paper'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs">Pix Copia/Cola</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('boleto')}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'boleto'
                      ? 'border-brand-wood bg-brand-paper text-brand-wood font-bold'
                      : 'border-brand-wood/10 text-brand-clay hover:bg-brand-paper'
                  }`}
                >
                  <Barcode className="w-5 h-5" />
                  <span className="text-xs">Boleto</span>
                </button>
              </div>
            </div>

            {/* Conditional fields based on Payment Option selected */}
            {paymentMethod === 'credit_card' && (
              <div className="space-y-4 p-4 bg-brand-paper rounded-2xl border border-brand-wood/10 transition-all">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-clay uppercase tracking-widest">Número do Cartão</label>
                  <input 
                    type="text" 
                    required
                    value={formData.cardNumber}
                    onChange={e => setFormData({ ...formData, cardNumber: e.target.value })}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-brand-wood/10 focus:outline-none focus:ring-2 focus:ring-brand-wood/10 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-clay uppercase tracking-widest">Nome Impresso</label>
                  <input 
                    type="text" 
                    required
                    value={formData.cardName}
                    onChange={e => setFormData({ ...formData, cardName: e.target.value })}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-brand-wood/10 focus:outline-none bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-clay uppercase tracking-widest">Validade</label>
                    <input 
                      type="text" 
                      required
                      value={formData.cardExpiry}
                      onChange={e => setFormData({ ...formData, cardExpiry: e.target.value })}
                      className="w-full px-4 py-2 text-sm rounded-lg border border-brand-wood/10 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-clay uppercase tracking-widest">CVV</label>
                    <input 
                      type="text" 
                      required
                      value={formData.cardCvv}
                      onChange={e => setFormData({ ...formData, cardCvv: e.target.value })}
                      className="w-full px-4 py-2 text-sm rounded-lg border border-brand-wood/10 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'pix' && (
              <div className="p-5 bg-brand-paper rounded-2xl border border-brand-wood/10 text-center space-y-2">
                <QrCode className="w-8 h-8 text-brand-wood mx-auto animate-pulse" />
                <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Aprovação Instantânea</h4>
                <p className="text-brand-clay text-xs leading-relaxed max-w-sm mx-auto font-light">
                  Ao concluir, exibiremos a chave Pix Copia e Cola. O sistema simulará o recebimento e liberará seu acesso em instantes.
                </p>
              </div>
            )}

            {paymentMethod === 'boleto' && (
              <div className="p-5 bg-brand-paper rounded-2xl border border-brand-wood/10 text-center space-y-2">
                <Barcode className="w-8 h-8 text-[#8B5E3C] mx-auto" />
                <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Simulação de Boleto</h4>
                <p className="text-brand-clay text-xs leading-relaxed max-w-sm mx-auto font-light">
                  Em nosso simulador, você poderá aprovar esse pagamento instantaneamente na aba de Produtor (Andrew).
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-brand-wood hover:bg-brand-clay text-white rounded-full text-sm font-sans font-medium shadow-lg shadow-brand-wood/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Processando Pagamento...
                </>
              ) : (
                `Finalizar Matrícula - R$ ${finalPrice},00`
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Cart Summary & Coupon Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-brand-wood/10 shadow-sm space-y-5">
            <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">Resumo do Pedido</h3>
            
            {/* Product description card */}
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-brand-paper rounded-2xl overflow-hidden flex-shrink-0 border border-brand-wood/10">
                <img 
                  src={getDirectDriveUrl(product.coverUrl)} 
                  alt={product.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] bg-brand-clay/10 text-brand-wood font-sans font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {productType === 'course' ? 'Curso da Academia' : 'Apostila Técnica'}
                </span>
                <h4 className="text-sm font-serif font-semibold text-[#1A1A1A] line-clamp-2 leading-tight">
                  {product.title}
                </h4>
                <p className="text-xs text-brand-clay">Acesso Permanente</p>
              </div>
            </div>

            {/* Coupons Form */}
            <div className="pt-4 border-t border-brand-wood/10 space-y-3">
              <label className="text-[10px] font-sans font-bold text-[#8B5E3C] uppercase tracking-widest block">Cupom de Desconto</label>
              {appliedCoupon ? (
                <div className="bg-brand-paper text-brand-wood border border-brand-wood/20 rounded-2xl px-4 py-2.5 flex justify-between items-center text-xs">
                  <span className="font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                    <Ticket className="w-4 h-4 text-brand-clay" /> {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)
                  </span>
                  <button 
                    onClick={handleRemoveCoupon} 
                    className="text-brand-clay hover:text-brand-wood font-bold"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
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
                    onClick={() => { setCouponCode('BLACKFRIDAY50'); }}
                    className="hover:text-brand-wood font-medium hover:underline bg-brand-paper px-2 py-0.5 rounded-full border border-brand-wood/10"
                  >
                    BLACKFRIDAY50 (50%)
                  </button>
                  <button 
                    onClick={() => { setCouponCode('PROMO20'); }}
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
                <span>R$ {basePrice},00</span>
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
              <Sparkles className="w-3 h-3 text-brand-clay" /> Ambiente Seguro & Protegido
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
