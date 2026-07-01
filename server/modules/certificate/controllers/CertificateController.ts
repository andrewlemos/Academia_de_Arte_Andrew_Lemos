import { Request, Response, NextFunction } from "express";
import { CertificateService } from "../services/CertificateService";

export class CertificateController {
  private certificateService = new CertificateService();

  public async getCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const cert = await this.certificateService.getCertificate(id);
      if (!cert) {
        res.status(404).json({ error: "Certificado não encontrado." });
        return;
      }
      res.status(200).json(cert);
    } catch (error) {
      next(error);
    }
  }

  public async listCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const certs = await this.certificateService.listCertificates();
      res.status(200).json(certs);
    } catch (error) {
      next(error);
    }
  }

  public async issueCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, studentName, courseId, courseTitle } = req.body;
      const cert = await this.certificateService.issueCertificate(studentId, studentName, courseId, courseTitle);
      res.status(200).json({ success: true, certificate: cert });
    } catch (error) {
      next(error);
    }
  }

  public async validateCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const cert = await this.certificateService.validateCertificate(code);
      if (cert) {
        res.status(200).json({ valid: true, certificate: cert });
      } else {
        res.status(200).json({ valid: false, message: "Certificado não encontrado." });
      }
    } catch (error) {
      next(error);
    }
  }
}
