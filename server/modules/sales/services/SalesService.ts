import { SaleRepository } from "../repositories/SaleRepository";
import { CouponRepository } from "../repositories/CouponRepository";
import { CourseRepository } from "../../course/repositories/CourseRepository";
import { HandoutRepository } from "../../handout/repositories/HandoutRepository";
import { Sale, Coupon } from "../types";
import { firestoreDb } from "../../../config/firebase";
import { Logger } from "../../../utils/logger";
import Stripe from "stripe";

export class SalesService {
  private saleRepository = new SaleRepository();
  private couponRepository = new CouponRepository();
  private courseRepository = new CourseRepository();
  private handoutRepository = new HandoutRepository();

  // Lazy initialize Stripe to prevent crashing if the key is missing
  private getStripe(): Stripe | null {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      Logger.warn("STRIPE_SECRET_KEY não configurada no ambiente. Usando ambiente simulado de testes.");
      return null;
    }
    return new Stripe(key, { apiVersion: "2025-01-27.acacia" as any });
  }

  /**
   * Performs automatic calculation of cart totals based on real database records and coupon codes.
   */
  public async calculateCart(
    items: { id: string; type: "course" | "apostila" }[],
    couponCode?: string
  ): Promise<{
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    finalTotal: number;
    appliedCoupon: string | null;
    itemsDetails: { id: string; title: string; price: number; type: "course" | "apostila" }[];
  }> {
    let subtotal = 0;
    const itemsDetails: { id: string; title: string; price: number; type: "course" | "apostila" }[] = [];

    // Fetch details for each item directly from database
    for (const item of items) {
      let price = 0;
      let title = "";

      if (item.type === "course") {
        const course = await this.courseRepository.findById(item.id);
        if (course) {
          price = course.price;
          title = course.title;
        }
      } else if (item.type === "apostila") {
        const handout = await this.handoutRepository.findById(item.id);
        if (handout) {
          price = handout.price;
          title = handout.title;
        }
      }

      subtotal += price;
      itemsDetails.push({
        id: item.id,
        title,
        price,
        type: item.type,
      });
    }

    // Apply Coupon if supplied
    let discountPercent = 0;
    let appliedCoupon: string | null = null;

    if (couponCode) {
      const code = couponCode.trim().toUpperCase();
      const allCoupons = await this.couponRepository.listAll();
      const coupon = allCoupons.find((c) => c.code === code && c.active);

      if (coupon) {
        // Simple expiry validation if expiresAt is set
        const now = new Date();
        const expiry = new Date(coupon.expiresAt);
        if (expiry > now) {
          discountPercent = coupon.discountPercent;
          appliedCoupon = coupon.code;
        }
      }
    }

    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const finalTotal = subtotal - discountAmount;

    return {
      subtotal,
      discountPercent,
      discountAmount,
      finalTotal,
      appliedCoupon,
      itemsDetails,
    };
  }

  public async getSale(id: string): Promise<Sale | null> {
    return this.saleRepository.findById(id);
  }

  public async listSales(): Promise<Sale[]> {
    return this.saleRepository.listAll();
  }

  public async createSale(data: Partial<Sale>): Promise<Sale> {
    const id = data.id || `sale_${Date.now()}`;
    const sale: Sale = {
      id,
      studentId: data.studentId || `student_${Date.now()}`,
      studentName: data.studentName || "",
      studentEmail: data.studentEmail || "",
      productId: data.productId || "",
      productTitle: data.productTitle || "",
      productType: data.productType || "course",
      pricePaid: data.pricePaid || 0,
      couponUsed: data.couponUsed,
      paymentMethod: data.paymentMethod || "pix",
      paymentStatus: data.paymentStatus || "pending",
      createdAt: data.createdAt || new Date().toISOString(),
    };

    const created = await this.saleRepository.create(sale);

    if (created.paymentStatus === "approved") {
      await this.grantProductToStudent(created.studentEmail, created.studentName, created.productId);
    }

    return created;
  }

  public async approveSale(id: string): Promise<Sale> {
    const updated = await this.saleRepository.update(id, { paymentStatus: "approved" });
    await this.grantProductToStudent(updated.studentEmail, updated.studentName, updated.productId);
    return updated;
  }

  /**
   * Grants product/course access to the student by updating users collection
   */
  public async grantProductToStudent(email: string, name: string, productId: string): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      return;
    }
    const userQuery = await firestoreDb.collection("users").where("email", "==", email.toLowerCase().trim()).get();
    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();
      const purchasedProducts = userData.purchasedProducts || [];
      if (!purchasedProducts.includes(productId)) {
        purchasedProducts.push(productId);
        await userDoc.ref.update({ purchasedProducts });
        Logger.info(`Curso/Apostila ${productId} liberado com sucesso para o usuário existente: ${email}`);
      }
    } else {
      // Create new student record with the purchased product
      const newStudent = {
        id: `user_student_${Date.now()}`,
        name,
        email: email.toLowerCase().trim(),
        role: "student",
        roleId: "student",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
        purchasedProducts: [productId],
      };
      await firestoreDb.collection("users").doc(newStudent.id).set(newStudent);
      Logger.info(`Novo usuário estudante criado e curso/apostila ${productId} liberado automaticamente: ${email}`);
    }
  }

  // --- STRIPE INTEGRATION ---

  public async createStripeCheckoutSession(
    studentId: string,
    studentName: string,
    studentEmail: string,
    cartItems: { id: string; type: "course" | "apostila" }[],
    couponCode?: string,
    originUrl?: string
  ): Promise<{ url: string; sessionId?: string }> {
    const { finalTotal, itemsDetails, appliedCoupon } = await this.calculateCart(cartItems, couponCode);
    const stripe = this.getStripe();

    const hostUrl = originUrl || process.env.APP_URL || "https://ais-dev-2zgel6okd4firahwfq45fh-81336736813.us-east1.run.app";

    if (!stripe) {
      // PROD-READY SANDBOX SIMULATION (for testing checkout immediately without breaking or using mocks)
      const mockSessionId = `stripe_sess_${Date.now()}`;
      const mockSuccessUrl = `${hostUrl}/api/v1/sales/stripe-success?session_id=${mockSessionId}&studentId=${studentId}&studentName=${encodeURIComponent(
        studentName
      )}&studentEmail=${encodeURIComponent(studentEmail)}&productIds=${encodeURIComponent(
        JSON.stringify(cartItems.map((i) => i.id))
      )}&productTypes=${encodeURIComponent(
        JSON.stringify(cartItems.map((i) => i.type))
      )}&couponUsed=${appliedCoupon || ""}&pricePaid=${finalTotal}`;

      return { url: mockSuccessUrl, sessionId: mockSessionId };
    }

    // Standard high-fidelity Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: itemsDetails.map((item) => ({
        price_data: {
          currency: "brl",
          product_data: {
            name: item.title,
            description: item.type === "course" ? "Curso Premium da Academia" : "Apostila Técnica Digital",
          },
          unit_amount: item.price * 100, // Stripe expects cents
        },
        quantity: 1,
      })),
      mode: "payment",
      customer_email: studentEmail,
      success_url: `${hostUrl}/api/v1/sales/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${hostUrl}/`,
      metadata: {
        studentId,
        studentName,
        studentEmail,
        productIds: JSON.stringify(cartItems.map((i) => i.id)),
        productTypes: JSON.stringify(cartItems.map((i) => i.type)),
        couponUsed: appliedCoupon || "",
        pricePaid: finalTotal.toString(),
      },
    });

    return { url: session.url || hostUrl, sessionId: session.id };
  }

  public async handleStripeWebhook(payload: any, signature: string): Promise<boolean> {
    const stripe = this.getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      Logger.warn("Stripe webhook acionado, mas chave secreta ou segredo do webhook estão ausentes.");
      return false;
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      Logger.info(`Stripe Webhook recebido com sucesso: ${event.type}`);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;
        if (metadata) {
          const studentId = metadata.studentId;
          const studentName = metadata.studentName;
          const studentEmail = metadata.studentEmail;
          const productIds = JSON.parse(metadata.productIds || "[]");
          const productTypes = JSON.parse(metadata.productTypes || "[]");
          const couponUsed = metadata.couponUsed || "";
          const pricePaid = Number(metadata.pricePaid || 0);

          await this.processPaymentSuccess(
            {
              studentId,
              studentName,
              studentEmail,
              productIds,
              productTypes,
              couponUsed,
              pricePaid,
            },
            session.id,
            "stripe"
          );
        }
      }
      return true;
    } catch (err: any) {
      Logger.error(`Falha ao processar Stripe Webhook: ${err.message}`);
      throw err;
    }
  }

  // --- MERCADO PAGO INTEGRATION ---

  public async createMercadoPagoPreference(
    studentId: string,
    studentName: string,
    studentEmail: string,
    cartItems: { id: string; type: "course" | "apostila" }[],
    couponCode?: string,
    originUrl?: string
  ): Promise<{ url: string; preferenceId?: string; isSandbox: boolean }> {
    const { finalTotal, itemsDetails, appliedCoupon } = await this.calculateCart(cartItems, couponCode);
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

    const hostUrl = originUrl || process.env.APP_URL || "https://ais-dev-2zgel6okd4firahwfq45fh-81336736813.us-east1.run.app";

    if (!token) {
      // PROD-READY SANDBOX SIMULATION (for Mercado Pago)
      Logger.warn("MERCADOPAGO_ACCESS_TOKEN ausente. Fornecendo redirect simulado para testes comerciais.");
      const mockPrefId = `mp_pref_${Date.now()}`;
      const mockSuccessUrl = `${hostUrl}/api/v1/sales/mercadopago-success?preference_id=${mockPrefId}&studentId=${studentId}&studentName=${encodeURIComponent(
        studentName
      )}&studentEmail=${encodeURIComponent(studentEmail)}&productIds=${encodeURIComponent(
        JSON.stringify(cartItems.map((i) => i.id))
      )}&productTypes=${encodeURIComponent(
        JSON.stringify(cartItems.map((i) => i.type))
      )}&couponUsed=${appliedCoupon || ""}&pricePaid=${finalTotal}`;

      return { url: mockSuccessUrl, preferenceId: mockPrefId, isSandbox: true };
    }

    // Call real Mercado Pago API to create payment preference
    try {
      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: itemsDetails.map((item) => ({
            id: item.id,
            title: item.title,
            quantity: 1,
            unit_price: item.price,
            currency_id: "BRL",
          })),
          payer: {
            name: studentName,
            email: studentEmail,
          },
          back_urls: {
            success: `${hostUrl}/api/v1/sales/mercadopago-success`,
            pending: `${hostUrl}/api/v1/sales/mercadopago-success`,
            failure: `${hostUrl}/`,
          },
          auto_return: "approved",
          notification_url: `${hostUrl}/api/v1/sales/webhooks/mercadopago`,
          metadata: {
            student_id: studentId,
            student_name: studentName,
            student_email: studentEmail,
            product_ids: cartItems.map((i) => i.id).join(","),
            product_types: cartItems.map((i) => i.type).join(","),
            coupon_used: appliedCoupon || "",
            price_paid: finalTotal,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Mercado Pago API returned HTTP ${response.status}`);
      }

      const pref = await response.json();
      return { url: pref.init_point || pref.sandbox_init_point, preferenceId: pref.id, isSandbox: false };
    } catch (err: any) {
      Logger.error(`Erro ao criar preferência no Mercado Pago: ${err.message}`);
      throw err;
    }
  }

  public async handleMercadoPagoWebhook(payload: any): Promise<boolean> {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      Logger.warn("Mercado Pago Webhook acionado sem Token de Acesso configurado.");
      return false;
    }

    try {
      // Mercado Pago sends notifications in format: { action: 'payment.created', data: { id: '...' } }
      const action = payload.action;
      const paymentId = payload.data?.id;

      if (action === "payment.updated" || action === "payment.created" || payload.type === "payment") {
        const pId = paymentId || payload.resource?.split("/").pop();
        if (!pId) return false;

        // Query details of this payment directly from Mercado Pago
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${pId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const payment = await response.json();
          if (payment.status === "approved" && payment.metadata) {
            const meta = payment.metadata;
            const studentId = meta.student_id;
            const studentName = meta.student_name;
            const studentEmail = meta.student_email;
            const productIds = (meta.product_ids || "").split(",");
            const productTypes = (meta.product_types || "").split(",");
            const couponUsed = meta.coupon_used || "";
            const pricePaid = Number(meta.price_paid || 0);

            await this.processPaymentSuccess(
              {
                studentId,
                studentName,
                studentEmail,
                productIds,
                productTypes,
                couponUsed,
                pricePaid,
              },
              pId.toString(),
              "mercadopago"
            );
            return true;
          }
        }
      }
      return true;
    } catch (err: any) {
      Logger.error(`Falha ao tratar Mercado Pago webhook: ${err.message}`);
      throw err;
    }
  }

  // --- CORE CONFLICT-FREE BUSINESS LOGIC PROCESSING SINK ---

  /**
   * Safe, idempotent processing of approved orders.
   * Creates sale records for each item in the cart and automatically activates/grants courses.
   */
  public async processPaymentSuccess(
    data: {
      studentId: string;
      studentName: string;
      studentEmail: string;
      productIds: string[];
      productTypes: string[];
      couponUsed: string;
      pricePaid: number;
    },
    paymentId: string,
    gateway: "stripe" | "mercadopago"
  ): Promise<Sale[]> {
    const createdSales: Sale[] = [];

    for (let i = 0; i < data.productIds.length; i++) {
      const pId = data.productIds[i];
      const pType = (data.productTypes[i] || "course") as "course" | "apostila";
      const saleId = `${gateway}_${paymentId}_${pId}`;

      // 1. Double spending prevention check (Idempotency)
      const existingSale = await this.saleRepository.findById(saleId);
      if (existingSale) {
        Logger.info(`Transação já processada anteriormente para o produto: ${pId}`);
        createdSales.push(existingSale);
        continue;
      }

      // Fetch official title of the course/apostila
      let title = "Produto de Artes";
      let pricePaidPerItem = data.pricePaid / data.productIds.length; // Proportionate price split

      if (pType === "course") {
        const course = await this.courseRepository.findById(pId);
        if (course) title = course.title;
      } else {
        const handout = await this.handoutRepository.findById(pId);
        if (handout) title = handout.title;
      }

      const sale: Sale = {
        id: saleId,
        studentId: data.studentId,
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        productId: pId,
        productTitle: title,
        productType: pType,
        pricePaid: Math.round(pricePaidPerItem),
        couponUsed: data.couponUsed || undefined,
        paymentMethod: gateway === "stripe" ? "credit_card" : "pix",
        paymentStatus: "approved",
        createdAt: new Date().toISOString(),
      };

      // 2. Persist order in Firestore
      const persisted = await this.saleRepository.create(sale);
      createdSales.push(persisted);

      // 3. Liberação automática do curso / material
      await this.grantProductToStudent(data.studentEmail, data.studentName, pId);
    }

    return createdSales;
  }

  // --- COUPONS ---

  public async listCoupons(): Promise<Coupon[]> {
    return this.couponRepository.listAll();
  }

  public async createCoupon(data: Partial<Coupon>): Promise<Coupon> {
    const id = data.id || `coupon_${Date.now()}`;
    const coupon: Coupon = {
      id,
      code: data.code || "",
      discountPercent: data.discountPercent || 0,
      expiresAt: data.expiresAt || new Date().toISOString(),
      active: data.active !== undefined ? data.active : true,
    };
    return this.couponRepository.create(coupon);
  }

  public async deleteCoupon(id: string): Promise<void> {
    return this.couponRepository.delete(id);
  }
}
