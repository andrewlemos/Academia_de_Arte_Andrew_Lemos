import { CertificateRepository } from "../repositories/CertificateRepository";
import { Certificate } from "../types";

export class CertificateService {
  private certificateRepository = new CertificateRepository();

  public async getCertificate(id: string): Promise<Certificate | null> {
    return this.certificateRepository.findById(id);
  }

  public async listCertificates(): Promise<Certificate[]> {
    return this.certificateRepository.listAll();
  }

  public async issueCertificate(studentId: string, studentName: string, courseId: string, courseTitle: string): Promise<Certificate> {
    const existing = await this.certificateRepository.findByStudentAndCourse(studentId, courseId);
    if (existing) {
      return existing;
    }

    const code = `CERT-${courseId.split("_")[1]?.toUpperCase() || "LMS"}-${Math.floor(100000 + Math.random() * 900000)}`;
    const cert: Certificate = {
      id: `cert_${Date.now()}`,
      studentId,
      studentName,
      courseId,
      courseTitle,
      issuedAt: new Date().toISOString(),
      validationCode: code,
    };

    return this.certificateRepository.create(cert);
  }

  public async validateCertificate(code: string): Promise<Certificate | null> {
    return this.certificateRepository.findByCode(code);
  }
}
