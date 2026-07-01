import { Router } from "express";
import { SalesController } from "./controllers/SalesController";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/authorization.middleware";
import { validateRequest } from "../../middlewares/validation.middleware";
import { createSaleSchema, createCouponSchema } from "./dto";

const router = Router();
const controller = new SalesController();

// --- Automatic Calculation & Webhooks (Must be registered before parameterized routes) ---
router.post("/calculate", (req, res, next) => controller.calculateCart(req, res, next));

// Stripe webhooks and success redirection
router.post("/webhooks/stripe", (req, res, next) => controller.stripeWebhook(req, res, next));
router.get("/stripe-success", (req, res, next) => controller.stripeSuccess(req, res, next));

// Mercado Pago webhooks and success redirection
router.post("/webhooks/mercadopago", (req, res, next) => controller.mercadopagoWebhook(req, res, next));
router.get("/mercadopago-success", (req, res, next) => controller.mercadopagoSuccess(req, res, next));

// Checkout actions
router.post("/checkout/stripe", (req, res, next) => controller.checkoutStripe(req, res, next));
router.post("/checkout/mercadopago", (req, res, next) => controller.checkoutMercadoPago(req, res, next));

// Sales Endpoints (Public listing/creation to allow checkouts, Admin can approve/view)
router.get("/", authenticate, requirePermission("users.read"), (req, res, next) => controller.listSales(req, res, next));
router.post("/", validateRequest({ body: createSaleSchema }), (req, res, next) => controller.createSale(req, res, next));
router.post("/:id/approve", authenticate, requirePermission("users.update"), (req, res, next) => controller.approveSale(req, res, next));

// Coupon Endpoints (Public read for checkout coupon validation, Admin can write)
router.get("/coupons", (req, res, next) => controller.listCoupons(req, res, next));

router.post(
  "/coupons",
  authenticate,
  requirePermission("courses.update"),
  validateRequest({ body: createCouponSchema }),
  (req, res, next) => controller.createCoupon(req, res, next)
);

router.delete(
  "/coupons/:id",
  authenticate,
  requirePermission("courses.update"),
  (req, res, next) => controller.deleteCoupon(req, res, next)
);

export default router;
