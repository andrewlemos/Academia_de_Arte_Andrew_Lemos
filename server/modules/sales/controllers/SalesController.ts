import { Request, Response, NextFunction } from "express";
import { SalesService } from "../services/SalesService";
import { Logger } from "../../../utils/logger";

export class SalesController {
  private salesService = new SalesService();

  public async getSale(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sale = await this.salesService.getSale(id);
      if (!sale) {
        res.status(404).json({ error: "Venda não encontrada" });
        return;
      }
      res.status(200).json(sale);
    } catch (error) {
      next(error);
    }
  }

  public async listSales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sales = await this.salesService.listSales();
      res.status(200).json(sales);
    } catch (error) {
      next(error);
    }
  }

  public async createSale(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sale = await this.salesService.createSale(req.body);
      res.status(200).json({ success: true, sale });
    } catch (error) {
      next(error);
    }
  }

  public async approveSale(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sale = await this.salesService.approveSale(id);
      res.status(200).json({ success: true, sale });
    } catch (error) {
      next(error);
    }
  }

  // --- AUTOMATIC CALCULATION ---

  public async calculateCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { items, couponCode } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ error: "Parâmetro 'items' deve ser um array." });
        return;
      }
      const calculation = await this.salesService.calculateCart(items, couponCode);
      res.status(200).json(calculation);
    } catch (error) {
      next(error);
    }
  }

  // --- STRIPE CHECKOUT ---

  public async checkoutStripe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, studentName, studentEmail, cartItems, couponCode } = req.body;

      if (!studentId || !studentEmail || !Array.isArray(cartItems)) {
        res.status(400).json({ error: "Parâmetros inválidos para checkout." });
        return;
      }

      // Get full absolute hostname for callback redirects
      const originUrl = `${req.protocol}://${req.get("host")}`;

      const session = await this.salesService.createStripeCheckoutSession(
        studentId,
        studentName,
        studentEmail,
        cartItems,
        couponCode,
        originUrl
      );

      res.status(200).json({ success: true, checkoutUrl: session.url, sessionId: session.sessionId });
    } catch (error) {
      next(error);
    }
  }

  public async stripeSuccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { session_id, studentId, studentName, studentEmail, productIds, productTypes, couponUsed, pricePaid } = req.query;

      // Check if this was a simulation sandbox redirect
      if (studentId && studentEmail && productIds) {
        const parsedProductIds = JSON.parse(studentId ? decodeURIComponent(productIds as string) : "[]");
        const parsedProductTypes = JSON.parse(studentId ? decodeURIComponent(productTypes as string) : "[]");

        await this.salesService.processPaymentSuccess(
          {
            studentId: studentId as string,
            studentName: decodeURIComponent(studentName as string),
            studentEmail: decodeURIComponent(studentEmail as string),
            productIds: parsedProductIds,
            productTypes: parsedProductTypes,
            couponUsed: (couponUsed as string) || "",
            pricePaid: Number(pricePaid || 0),
          },
          (session_id as string) || `sim_sess_${Date.now()}`,
          "stripe"
        );

        res.redirect("/?payment_success=true&gateway=stripe");
        return;
      }

      // Real Stripe integration success verification
      if (!session_id) {
        res.redirect("/?payment_failed=true");
        return;
      }

      // Retrieve full session details from Stripe to guarantee authenticity and prevent URL tampering
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        const stripe = new (await import("stripe")).default(stripeKey, { apiVersion: "2025-01-27.acacia" as any });
        const session = await stripe.checkout.sessions.retrieve(session_id as string);

        if (session.payment_status === "paid" && session.metadata) {
          const meta = session.metadata;
          await this.salesService.processPaymentSuccess(
            {
              studentId: meta.studentId,
              studentName: meta.studentName,
              studentEmail: meta.studentEmail,
              productIds: JSON.parse(meta.productIds || "[]"),
              productTypes: JSON.parse(meta.productTypes || "[]"),
              couponUsed: meta.couponUsed || "",
              pricePaid: Number(meta.pricePaid || 0),
            },
            session.id,
            "stripe"
          );
        }
      }

      res.redirect("/?payment_success=true&gateway=stripe");
    } catch (error) {
      Logger.error("Erro no retorno de sucesso do Stripe:", error);
      res.redirect("/?payment_failed=true");
    }
  }

  public async stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const rawBody = (req as any).rawBody;

      if (!signature || !rawBody) {
        res.status(400).send("Assinatura do webhook inválida.");
        return;
      }

      const verified = await this.salesService.handleStripeWebhook(rawBody, signature);
      if (verified) {
        res.status(200).json({ received: true });
      } else {
        res.status(400).send("Falha na validação do webhook.");
      }
    } catch (error) {
      next(error);
    }
  }

  // --- MERCADO PAGO CHECKOUT ---

  public async checkoutMercadoPago(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, studentName, studentEmail, cartItems, couponCode } = req.body;

      if (!studentId || !studentEmail || !Array.isArray(cartItems)) {
        res.status(400).json({ error: "Parâmetros inválidos para checkout." });
        return;
      }

      const originUrl = `${req.protocol}://${req.get("host")}`;

      const pref = await this.salesService.createMercadoPagoPreference(
        studentId,
        studentName,
        studentEmail,
        cartItems,
        couponCode,
        originUrl
      );

      res.status(200).json({
        success: true,
        checkoutUrl: pref.url,
        preferenceId: pref.preferenceId,
        isSandbox: pref.isSandbox,
      });
    } catch (error) {
      next(error);
    }
  }

  public async mercadopagoSuccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { preference_id, studentId, studentName, studentEmail, productIds, productTypes, couponUsed, pricePaid, payment_id } = req.query;

      // Handle Sandbox redirect simulation
      if (studentId && studentEmail && productIds) {
        const parsedProductIds = JSON.parse(decodeURIComponent(productIds as string));
        const parsedProductTypes = JSON.parse(decodeURIComponent(productTypes as string));

        await this.salesService.processPaymentSuccess(
          {
            studentId: studentId as string,
            studentName: decodeURIComponent(studentName as string),
            studentEmail: decodeURIComponent(studentEmail as string),
            productIds: parsedProductIds,
            productTypes: parsedProductTypes,
            couponUsed: (couponUsed as string) || "",
            pricePaid: Number(pricePaid || 0),
          },
          (preference_id as string) || `sim_mp_${Date.now()}`,
          "mercadopago"
        );

        res.redirect("/?payment_success=true&gateway=mercadopago");
        return;
      }

      // Real Mercado Pago success handling
      // MP redirects back with query parameters including payment_id and preference_id
      const pId = payment_id as string;
      const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (pId && mpToken) {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${pId}`, {
          headers: { Authorization: `Bearer ${mpToken}` },
        });

        if (response.ok) {
          const payment = await response.json();
          if (payment.status === "approved" && payment.metadata) {
            const meta = payment.metadata;
            await this.salesService.processPaymentSuccess(
              {
                studentId: meta.student_id,
                studentName: meta.student_name,
                studentEmail: meta.student_email,
                productIds: (meta.product_ids || "").split(","),
                productTypes: (meta.product_types || "").split(","),
                couponUsed: meta.coupon_used || "",
                pricePaid: Number(meta.price_paid || 0),
              },
              pId,
              "mercadopago"
            );
          }
        }
      }

      res.redirect("/?payment_success=true&gateway=mercadopago");
    } catch (error) {
      Logger.error("Erro no retorno de sucesso do Mercado Pago:", error);
      res.redirect("/?payment_failed=true");
    }
  }

  public async mercadopagoWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const processed = await this.salesService.handleMercadoPagoWebhook(req.body);
      if (processed) {
        res.status(200).json({ received: true });
      } else {
        res.status(200).json({ received: true, ignored: true });
      }
    } catch (error) {
      next(error);
    }
  }

  // --- COUPONS ---

  public async listCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupons = await this.salesService.listCoupons();
      res.status(200).json(coupons);
    } catch (error) {
      next(error);
    }
  }

  public async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupon = await this.salesService.createCoupon(req.body);
      res.status(200).json({ success: true, coupon });
    } catch (error) {
      next(error);
    }
  }

  public async deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.salesService.deleteCoupon(id);
      res.status(200).json({ success: true, message: "Cupom excluído com sucesso." });
    } catch (error) {
      next(error);
    }
  }
}
