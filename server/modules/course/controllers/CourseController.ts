import { Request, Response, NextFunction } from "express";
import { CourseService } from "../services/CourseService";

export class CourseController {
  private courseService = new CourseService();

  // --- Courses ---

  public async getCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const course = await this.courseService.getCourse(id);
      res.status(200).json(course);
    } catch (error) {
      next(error);
    }
  }

  public async listCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courses = await this.courseService.listCourses();
      res.status(200).json(courses);
    } catch (error) {
      next(error);
    }
  }

  public async createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const course = await this.courseService.createCourse(req.body);
      res.status(201).json({ success: true, course });
    } catch (error) {
      next(error);
    }
  }

  public async updateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const course = await this.courseService.updateCourse(id, req.body);
      res.status(200).json({ success: true, course });
    } catch (error) {
      next(error);
    }
  }

  public async deleteCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.courseService.deleteCourse(id);
      res.status(200).json({ success: true, message: "Curso e conteúdos removidos com sucesso." });
    } catch (error) {
      next(error);
    }
  }

  // --- Modules ---

  public async getModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const mod = await this.courseService.getModule(id);
      res.status(200).json(mod);
    } catch (error) {
      next(error);
    }
  }

  public async listModules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseId } = req.query;
      let modules;
      if (courseId) {
        modules = await this.courseService.listModulesByCourse(courseId as string);
      } else {
        modules = await this.courseService.listAllModules();
      }
      res.status(200).json(modules);
    } catch (error) {
      next(error);
    }
  }

  public async createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mod = await this.courseService.createModule(req.body);
      res.status(201).json({ success: true, module: mod });
    } catch (error) {
      next(error);
    }
  }

  public async updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const mod = await this.courseService.updateModule(id, req.body);
      res.status(200).json({ success: true, module: mod });
    } catch (error) {
      next(error);
    }
  }

  public async deleteModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.courseService.deleteModule(id);
      res.status(200).json({ success: true, message: "Módulo e suas aulas removidos com sucesso." });
    } catch (error) {
      next(error);
    }
  }

  // --- Lessons ---

  public async getLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const lesson = await this.courseService.getLesson(id);
      res.status(200).json(lesson);
    } catch (error) {
      next(error);
    }
  }

  public async listLessons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { moduleId } = req.query;
      let lessons;
      if (moduleId) {
        lessons = await this.courseService.listLessonsByModule(moduleId as string);
      } else {
        lessons = await this.courseService.listAllLessons();
      }
      res.status(200).json(lessons);
    } catch (error) {
      next(error);
    }
  }

  public async createLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lesson = await this.courseService.createLesson(req.body);
      res.status(201).json({ success: true, lesson });
    } catch (error) {
      next(error);
    }
  }

  public async updateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const lesson = await this.courseService.updateLesson(id, req.body);
      res.status(200).json({ success: true, lesson });
    } catch (error) {
      next(error);
    }
  }

  public async deleteLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.courseService.deleteLesson(id);
      res.status(200).json({ success: true, message: "Aula removida com sucesso." });
    } catch (error) {
      next(error);
    }
  }

  // --- Student Progress ---

  public async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, lessonId } = req.query;
      if (studentId && lessonId) {
        const progress = await this.courseService.getProgress(studentId as string, lessonId as string);
        res.status(200).json(progress);
      } else if (studentId) {
        const list = await this.courseService.listProgressByStudent(studentId as string);
        res.status(200).json(list);
      } else {
        const list = await this.courseService.listAllProgress();
        res.status(200).json(list);
      }
    } catch (error) {
      next(error);
    }
  }

  public async saveProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, lessonId, courseId, completed, completedAt, favorited, lastPosition, watchTime, lastAccessed } = req.body;
      const progress = await this.courseService.saveProgress(studentId, lessonId, courseId, {
        completed,
        completedAt,
        favorited,
        lastPosition,
        watchTime,
        lastAccessed,
      });
      res.status(200).json({ success: true, progress });
    } catch (error) {
      next(error);
    }
  }

  // --- Lesson Comments ---

  public async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonId } = req.query;
      let comments = await this.courseService.listAllComments();
      if (lessonId) {
        comments = comments.filter((c) => c.lessonId === lessonId && !c.parentCommentId);
      }
      res.status(200).json(comments);
    } catch (error) {
      next(error);
    }
  }

  public async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await this.courseService.createComment(req.body);
      res.status(201).json({ success: true, comment });
    } catch (error) {
      next(error);
    }
  }
}
