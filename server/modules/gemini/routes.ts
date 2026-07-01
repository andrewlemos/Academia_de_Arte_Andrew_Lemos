import { Router } from "express";
import { GeminiController } from "./controllers/GeminiController";

const router = Router();
const controller = new GeminiController();

router.post("/tutor", (req, res, next) => controller.askTutor(req, res, next));
router.post("/quiz", (req, res, next) => controller.generateQuiz(req, res, next));
router.post("/answer-ticket", (req, res, next) => controller.answerTicket(req, res, next));
router.post("/summary", (req, res, next) => controller.generateSummary(req, res, next));
router.post("/exercises", (req, res, next) => controller.suggestExercises(req, res, next));
router.post("/material", (req, res, next) => controller.generateComplementaryMaterial(req, res, next));
router.post("/correction", (req, res, next) => controller.correctAnswer(req, res, next));

export default router;
