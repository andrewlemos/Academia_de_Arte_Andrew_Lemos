import { Router } from "express";
import { HandoutController } from "./controllers/HandoutController";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/authorization.middleware";
import { validateRequest } from "../../middlewares/validation.middleware";
import { createHandoutSchema, updateHandoutSchema } from "./dto";

const router = Router();
const controller = new HandoutController();

router.get("/", (req, res, next) => controller.listHandouts(req, res, next));
router.get("/:id", (req, res, next) => controller.getHandout(req, res, next));

router.post(
  "/",
  authenticate,
  requirePermission("courses.update"),
  validateRequest({ body: createHandoutSchema }),
  (req, res, next) => controller.createHandout(req, res, next)
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("courses.update"),
  validateRequest({ body: updateHandoutSchema }),
  (req, res, next) => controller.updateHandout(req, res, next)
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("courses.update"),
  (req, res, next) => controller.deleteHandout(req, res, next)
);

export default router;
