import { Router } from "express";
import { SupportController } from "./controllers/SupportController";
import { validateRequest } from "../../middlewares/validation.middleware";
import { createSupportTicketSchema, answerTicketSchema } from "./dto";

const router = Router();
const controller = new SupportController();

router.get("/", (req, res, next) => controller.listTickets(req, res, next));
router.get("/:id", (req, res, next) => controller.getTicket(req, res, next));
router.post("/", validateRequest({ body: createSupportTicketSchema }), (req, res, next) => controller.createTicket(req, res, next));
router.post("/:id/answer", validateRequest({ body: answerTicketSchema }), (req, res, next) => controller.answerTicket(req, res, next));

export default router;
