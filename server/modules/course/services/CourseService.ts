import { CourseRepository } from "../repositories/CourseRepository";
import { ModuleRepository } from "../repositories/ModuleRepository";
import { LessonRepository } from "../repositories/LessonRepository";
import { ProgressRepository } from "../repositories/ProgressRepository";
import { CommentRepository } from "../repositories/CommentRepository";
import { Course, Module, Lesson, StudentProgress, SupportComment } from "../types";
import { Logger } from "../../../utils/logger";
import { NotFoundError } from "../../../utils/errors";
import { firestoreDb } from "../../../config/firebase";

export class CourseService {
  private courseRepository = new CourseRepository();
  private moduleRepository = new ModuleRepository();
  private lessonRepository = new LessonRepository();
  private progressRepository = new ProgressRepository();
  private commentRepository = new CommentRepository();

  // --- Courses ---

  public async getCourse(id: string): Promise<Course> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundError(`Curso com ID '${id}' não encontrado`);
    }
    return course;
  }

  public async listCourses(): Promise<Course[]> {
    return await this.courseRepository.listAll();
  }

  public async createCourse(courseData: Omit<Course, "id"> & { id?: string }): Promise<Course> {
    const id = courseData.id || `course_${Date.now()}`;
    const course: Course = {
      ...courseData,
      id,
      freeModules: courseData.freeModules || [],
    };
    Logger.info(`Criando curso: ${course.title} (${course.id})`);
    return await this.courseRepository.create(course);
  }

  public async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const course = await this.getCourse(id);
    Logger.info(`Atualizando curso: ${course.title} (${id})`);
    return await this.courseRepository.update(id, data);
  }

  public async deleteCourse(id: string): Promise<void> {
    const course = await this.getCourse(id);
    Logger.info(`Removendo curso e todo conteúdo associado: ${course.title} (${id})`);

    // 1. Cascade delete all modules
    const modules = await this.moduleRepository.listByCourseId(id);
    for (const mod of modules) {
      await this.moduleRepository.delete(mod.id);
    }

    // 2. Cascade delete all lessons
    const lessons = await this.lessonRepository.listByCourseId(id);
    for (const lesson of lessons) {
      await this.lessonRepository.delete(lesson.id);
    }

    // 3. Delete course
    await this.courseRepository.delete(id);
  }

  // --- Modules ---

  public async getModule(id: string): Promise<Module> {
    const mod = await this.moduleRepository.findById(id);
    if (!mod) {
      throw new NotFoundError(`Módulo com ID '${id}' não encontrado`);
    }
    return mod;
  }

  public async listModulesByCourse(courseId: string): Promise<Module[]> {
    await this.getCourse(courseId); // validate course exists
    return await this.moduleRepository.listByCourseId(courseId);
  }

  public async listAllModules(): Promise<Module[]> {
    return await this.moduleRepository.listAll();
  }

  public async createModule(moduleData: Omit<Module, "id"> & { id?: string }): Promise<Module> {
    await this.getCourse(moduleData.courseId); // validate course exists
    const id = moduleData.id || `module_${Date.now()}`;
    const mod: Module = {
      ...moduleData,
      id,
    };
    Logger.info(`Criando módulo: ${mod.title} para o curso ${mod.courseId}`);
    return await this.moduleRepository.create(mod);
  }

  public async updateModule(id: string, data: Partial<Module>): Promise<Module> {
    await this.getModule(id);
    return await this.moduleRepository.update(id, data);
  }

  public async deleteModule(id: string): Promise<void> {
    await this.getModule(id);

    // 1. Cascade delete lessons of this module
    const lessons = await this.lessonRepository.listByModuleId(id);
    for (const lesson of lessons) {
      await this.lessonRepository.delete(lesson.id);
    }

    // 2. Delete module
    await this.moduleRepository.delete(id);
  }

  // --- Lessons ---

  public async getLesson(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new NotFoundError(`Aula com ID '${id}' não encontrada`);
    }
    return lesson;
  }

  public async listLessonsByModule(moduleId: string): Promise<Lesson[]> {
    await this.getModule(moduleId); // validate module exists
    return await this.lessonRepository.listByModuleId(moduleId);
  }

  public async listAllLessons(): Promise<Lesson[]> {
    return await this.lessonRepository.listAll();
  }

  public async createLesson(lessonData: Omit<Lesson, "id"> & { id?: string }): Promise<Lesson> {
    await this.getCourse(lessonData.courseId);
    await this.getModule(lessonData.moduleId);
    const id = lessonData.id || `lesson_${Date.now()}`;
    const lesson: Lesson = {
      ...lessonData,
      id,
    };
    Logger.info(`Criando aula: ${lesson.title} para o módulo ${lesson.moduleId}`);
    return await this.lessonRepository.create(lesson);
  }

  public async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson> {
    await this.getLesson(id);
    return await this.lessonRepository.update(id, data);
  }

  public async deleteLesson(id: string): Promise<void> {
    await this.getLesson(id);
    await this.lessonRepository.delete(id);
  }

  // --- Student Progress ---

  public async getProgress(studentId: string, lessonId: string): Promise<StudentProgress | null> {
    return await this.progressRepository.findByStudentAndLesson(studentId, lessonId);
  }

  public async listProgressByStudent(studentId: string): Promise<StudentProgress[]> {
    return await this.progressRepository.listByStudent(studentId);
  }

  public async listAllProgress(): Promise<StudentProgress[]> {
    return await this.progressRepository.listAll();
  }

  public async saveProgress(studentId: string, lessonId: string, courseId: string, data: { completed?: boolean; completedAt?: string; favorited?: boolean; lastPosition?: number; watchTime?: number; lastAccessed?: string }): Promise<StudentProgress> {
    await this.getCourse(courseId);
    await this.getLesson(lessonId);

    const existing = await this.getProgress(studentId, lessonId);
    if (existing) {
      return await this.progressRepository.update(studentId, lessonId, {
        completed: data.completed !== undefined ? data.completed : existing.completed,
        completedAt: data.completedAt !== undefined ? data.completedAt : existing.completedAt,
        favorited: data.favorited !== undefined ? data.favorited : existing.favorited,
        lastPosition: data.lastPosition !== undefined ? data.lastPosition : existing.lastPosition,
        watchTime: data.watchTime !== undefined ? data.watchTime : existing.watchTime,
        lastAccessed: data.lastAccessed !== undefined ? data.lastAccessed : existing.lastAccessed,
      });
    }

    const newProgress: StudentProgress = {
      studentId,
      lessonId,
      courseId,
      completed: data.completed || false,
      completedAt: data.completedAt || undefined,
      favorited: data.favorited || false,
      lastPosition: data.lastPosition || undefined,
      watchTime: data.watchTime || undefined,
      lastAccessed: data.lastAccessed || undefined,
    };
    return await this.progressRepository.save(newProgress);
  }

  // --- Lesson Comments ---

  public async listAllComments(): Promise<SupportComment[]> {
    return await this.commentRepository.listAll();
  }

  public async getComment(id: string): Promise<SupportComment> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) {
      throw new NotFoundError(`Comentário com ID '${id}' não encontrado`);
    }
    return comment;
  }

  public async createComment(commentData: {
    lessonId: string;
    courseId: string;
    userName: string;
    userEmail: string;
    userRole: 'admin' | 'student';
    comment: string;
    avatarUrl?: string;
    parentCommentId?: string;
  }): Promise<SupportComment> {
    await this.getCourse(commentData.courseId);
    await this.getLesson(commentData.lessonId);

    const id = `comment_${Date.now()}`;
    const newComment: SupportComment = {
      id,
      lessonId: commentData.lessonId,
      courseId: commentData.courseId,
      userName: commentData.userName,
      userEmail: commentData.userEmail,
      userRole: commentData.userRole,
      avatarUrl: commentData.avatarUrl,
      comment: commentData.comment,
      createdAt: new Date().toISOString(),
      parentCommentId: commentData.parentCommentId,
    };

    if (commentData.parentCommentId) {
      // It's a reply! We should find the parent comment and add this reply to its nested list
      const parentComment = await this.getComment(commentData.parentCommentId);
      const replies = parentComment.replies || [];
      replies.push(newComment);
      await this.commentRepository.update(commentData.parentCommentId, { replies });
    } else {
      newComment.replies = [];
      await this.commentRepository.create(newComment);
    }

    return newComment;
  }
}
