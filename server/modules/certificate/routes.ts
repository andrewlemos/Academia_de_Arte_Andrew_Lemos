import { Router } from "express";
import { CertificateController } from "./controllers/CertificateController";
import { validateRequest } from "../../middlewares/validation.middleware";
import { issueCertificateSchema } from "./dto";

const router = Router();
const controller = new CertificateController();

router.get("/", (req, res, next) => controller.listCertificates(req, res, next));
router.get("/:id", (req, res, next) => controller.getCertificate(req, res, next));
router.post("/issue", validateRequest({ body: issueCertificateSchema }), (req, res, next) => controller.issueCertificate(req, res, next));
router.get("/validate/:code", (req, res, next) => controller.validateCertificate(req, res, next));

export default router;
