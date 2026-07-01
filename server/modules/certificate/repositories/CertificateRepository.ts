import { firestoreDb } from "../../../config/firebase";
import { Certificate } from "../types";

export class CertificateRepository {
  private collection = firestoreDb.collection("certificates");
  private static mockDb = new Map<string, Certificate>();

  public async findById(id: string): Promise<Certificate | null> {
    if (process.env.NODE_ENV === "test") {
      const cert = CertificateRepository.mockDb.get(id);
      return cert ? { ...cert } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Certificate;
  }

  public async listAll(): Promise<Certificate[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(CertificateRepository.mockDb.values()).map(c => ({ ...c }));
    }
    const snapshot = await this.collection.get();
    const certs: Certificate[] = [];
    snapshot.forEach((doc) => {
      certs.push({ id: doc.id, ...doc.data() } as Certificate);
    });
    return certs;
  }

  public async findByStudentAndCourse(studentId: string, courseId: string): Promise<Certificate | null> {
    if (process.env.NODE_ENV === "test") {
      const found = Array.from(CertificateRepository.mockDb.values())
        .find(c => c.studentId === studentId && c.courseId === courseId);
      return found ? { ...found } : null;
    }
    const snapshot = await this.collection
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Certificate;
  }

  public async findByCode(code: string): Promise<Certificate | null> {
    if (process.env.NODE_ENV === "test") {
      const found = Array.from(CertificateRepository.mockDb.values())
        .find(c => c.validationCode.toLowerCase() === code.toLowerCase());
      return found ? { ...found } : null;
    }
    const snapshot = await this.collection
      .where("validationCode", "==", code)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Certificate;
  }

  public async create(cert: Certificate): Promise<Certificate> {
    if (process.env.NODE_ENV === "test") {
      CertificateRepository.mockDb.set(cert.id, { ...cert });
      return cert;
    }
    await this.collection.doc(cert.id).set(cert);
    return cert;
  }
}
