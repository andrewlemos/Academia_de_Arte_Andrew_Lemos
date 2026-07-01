import { firestoreDb } from "../../../config/firebase";
import { Course } from "../types";
import { Logger } from "../../../utils/logger";

export class CourseRepository {
  private collection = firestoreDb.collection("courses");
  private static mockDb = new Map<string, Course>();

  public async findById(id: string): Promise<Course | null> {
    if (process.env.NODE_ENV === "test") {
      const course = CourseRepository.mockDb.get(id);
      return course ? { ...course } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Course;
  }

  public async listAll(): Promise<Course[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(CourseRepository.mockDb.values()).map(c => ({ ...c }));
    }
    const snapshot = await this.collection.get();
    const courses: Course[] = [];
    snapshot.forEach((doc) => {
      courses.push({ id: doc.id, ...doc.data() } as Course);
    });
    return courses;
  }

  public async create(course: Course): Promise<Course> {
    if (process.env.NODE_ENV === "test") {
      CourseRepository.mockDb.set(course.id, { ...course });
      return course;
    }
    await this.collection.doc(course.id).set(course);
    return course;
  }

  public async update(id: string, data: Partial<Course>): Promise<Course> {
    if (process.env.NODE_ENV === "test") {
      const existing = CourseRepository.mockDb.get(id);
      if (!existing) {
        throw new Error(`Curso com ID ${id} não pôde ser encontrado após a atualização.`);
      }
      const updated = { ...existing, ...data };
      CourseRepository.mockDb.set(id, updated);
      return updated;
    }
    await this.collection.doc(id).update(data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Curso com ID ${id} não pôde ser encontrado após a atualização.`);
    }
    return updated;
  }

  public async delete(id: string): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      CourseRepository.mockDb.delete(id);
      return;
    }
    await this.collection.doc(id).delete();
  }
}
