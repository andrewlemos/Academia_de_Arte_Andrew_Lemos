import { Router } from "express";
import { CourseController } from "./controllers/CourseController";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/authorization.middleware";
import { validateRequest } from "../../middlewares/validation.middleware";
import {
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
  saveProgressSchema,
  createCommentSchema,
} from "./dto";

const router = Router();
const controller = new CourseController();

// --- Courses ---

router.get(
  "/",
  (req, res, next) => controller.listCourses(req, res, next)
);

router.get(
  "/:id",
  (req, res, next) => controller.getCourse(req, res, next)
);

router.post(
  "/",
  authenticate,
  requirePermission("courses.create"),
  validateRequest({ body: createCourseSchema }),
  (req, res, next) => controller.createCourse(req, res, next)
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("courses.update"),
  validateRequest({ body: updateCourseSchema }),
  (req, res, next) => controller.updateCourse(req, res, next)
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("courses.delete"),
  (req, res, next) => controller.deleteCourse(req, res, next)
);

// --- Modules ---

router.get(
  "/modules/all",
  (req, res, next) => controller.listModules(req, res, next)
);

router.get(
  "/modules/:id",
  (req, res, next) => controller.getModule(req, res, next)
);

router.post(
  "/modules",
  authenticate,
  requirePermission("courses.update"),
  validateRequest({ body: createModuleSchema }),
  (req, res, next) => controller.createModule(req, res, next)
);

router.patch(
  "/modules/:id",
  authenticate,
  requirePermission("courses.update"),
  validateRequest({ body: updateModuleSchema }),
  (req, res, next) => controller.updateModule(req, res, next)
);

router.delete(
  "/modules/:id",
  authenticate,
  requirePermission("courses.update"),
  (req, res, next) => controller.deleteModule(req, res, next)
);

// --- Lessons ---

router.get(
  "/lessons/all",
  (req, res, next) => controller.listLessons(req, res, next)
);

router.get(
  "/lessons/:id",
  (req, res, next) => controller.getLesson(req, res, next)
);

router.post(
  "/lessons",
  authenticate,
  requirePermission("courses.update"),
  validateRequest({ body: createLessonSchema }),
  (req, res, next) => controller.createLesson(req, res, next)
);

router.patch(
  "/lessons/:id",
  authenticate,
  requirePermission("courses.update"),
  validateRequest({ body: updateLessonSchema }),
  (req, res, next) => controller.updateLesson(req, res, next)
);

router.delete(
  "/lessons/:id",
  authenticate,
  requirePermission("courses.update"),
  (req, res, next) => controller.deleteLesson(req, res, next)
);

// --- Student Progress ---

router.get(
  "/student-progress/all",
  authenticate,
  requirePermission("courses.read"),
  (req, res, next) => controller.getProgress(req, res, next)
);

router.post(
  "/student-progress",
  authenticate,
  requirePermission("courses.read"),
  validateRequest({ body: saveProgressSchema }),
  (req, res, next) => controller.saveProgress(req, res, next)
);

// --- Lesson Comments ---

router.get(
  "/comments/all",
  (req, res, next) => controller.getComments(req, res, next)
);

router.post(
  "/comments",
  authenticate,
  requirePermission("courses.read"),
  validateRequest({ body: createCommentSchema }),
  (req, res, next) => controller.createComment(req, res, next)
);

export default router;
