import assert from "assert";
import { CourseService } from "../modules/course/services/CourseService";
import { CourseRepository } from "../modules/course/repositories/CourseRepository";
import { ModuleRepository } from "../modules/course/repositories/ModuleRepository";
import { LessonRepository } from "../modules/course/repositories/LessonRepository";
import { Logger } from "../utils/logger";

// Mock global or environment variables
process.env.NODE_ENV = "test";

const courseService = new CourseService();
const courseRepository = new CourseRepository();
const moduleRepository = new ModuleRepository();
const lessonRepository = new LessonRepository();

async function runCourseTests() {
  Logger.info("========================================");
  Logger.info("  INICIANDO TESTES DA FASE 2 (COURSES)  ");
  Logger.info("========================================");

  try {
    // ----------------------------------------------------
    // TEST 1: Course creation, listing and retrieval
    // ----------------------------------------------------
    const testCourseId = "test-course-id";
    const newCourse = await courseService.createCourse({
      id: testCourseId,
      title: "Entalhe em Madeira de Lei",
      description: "Curso profissional avançado de entalhe em madeira",
      coverUrl: "https://example.com/cover.jpg",
      category: "woodcarving",
      price: 299,
      freeModules: [],
    });

    assert(newCourse.id === testCourseId, "O ID do curso gerado deve ser idêntico ao solicitado");
    assert(newCourse.title === "Entalhe em Madeira de Lei", "Título deve coincidir");
    Logger.info("✔ PASSED: Criação de curso validada com sucesso");

    const fetchedCourse = await courseService.getCourse(testCourseId);
    assert(fetchedCourse.description === "Curso profissional avançado de entalhe em madeira", "Descrição deve bater");
    Logger.info("✔ PASSED: Busca de curso por ID validada com sucesso");

    // ----------------------------------------------------
    // TEST 2: Module creation and listing
    // ----------------------------------------------------
    const testModuleId = "test-module-id";
    const newModule = await courseService.createModule({
      id: testModuleId,
      courseId: testCourseId,
      title: "Fundamentos das Fibras",
      description: "Como analisar e trabalhar a favor das fibras da madeira",
      order: 1,
    });

    assert(newModule.id === testModuleId, "ID do módulo deve bater");
    assert(newModule.courseId === testCourseId, "ID do curso associado deve bater");
    Logger.info("✔ PASSED: Criação de módulo validada com sucesso");

    const courseModules = await courseService.listModulesByCourse(testCourseId);
    assert(courseModules.length === 1, "O curso deve conter exatamente 1 módulo associado");
    assert(courseModules[0].id === testModuleId, "Módulo retornado deve ser o correspondente");
    Logger.info("✔ PASSED: Listagem de módulos por curso validada");

    // ----------------------------------------------------
    // TEST 3: Lesson creation, validation and listing
    // ----------------------------------------------------
    const testLessonId = "test-lesson-id";
    const newLesson = await courseService.createLesson({
      id: testLessonId,
      courseId: testCourseId,
      moduleId: testModuleId,
      title: "Aula Prática 1: Anatomia do Corte",
      description: "Vídeo-aula passo a passo sobre anatomia de corte",
      order: 1,
    });

    assert(newLesson.id === testLessonId, "ID da aula deve bater");
    assert(newLesson.moduleId === testModuleId, "ID do módulo associado deve bater");
    Logger.info("✔ PASSED: Criação de aula validada com sucesso");

    const moduleLessons = await courseService.listLessonsByModule(testModuleId);
    assert(moduleLessons.length === 1, "O módulo deve conter exatamente 1 aula");
    assert(moduleLessons[0].id === testLessonId, "Aula retornada deve ser correspondente");
    Logger.info("✔ PASSED: Listagem de aulas por módulo validada");

    // ----------------------------------------------------
    // TEST 4: Student Progress operations
    // ----------------------------------------------------
    const studentId = "student-test-uid";
    const savedProgress = await courseService.saveProgress(studentId, testLessonId, testCourseId, {
      completed: true,
      completedAt: new Date().toISOString(),
      favorited: true,
    });
    assert(savedProgress.studentId === studentId, "ID do estudante no progresso deve coincidir");
    assert(savedProgress.completed === true, "Progresso deve constar como completado");
    assert(savedProgress.favorited === true, "Progresso deve constar como favoritado");
    Logger.info("✔ PASSED: Criação/Gravação de progresso de estudante validada");

    const fetchedProgress = await courseService.getProgress(studentId, testLessonId);
    assert(fetchedProgress !== null && fetchedProgress.completed === true, "Progresso retornado deve ser válido e completado");
    Logger.info("✔ PASSED: Recuperação de progresso individual validada");

    const studentAllProgress = await courseService.listProgressByStudent(studentId);
    assert(studentAllProgress.length === 1, "Devem retornar todos os progressos do estudante");
    Logger.info("✔ PASSED: Listagem de todos os progressos de um estudante validada");

    // ----------------------------------------------------
    // TEST 5: Support / Lesson Comments
    // ----------------------------------------------------
    const comment = await courseService.createComment({
      lessonId: testLessonId,
      courseId: testCourseId,
      userName: "Student Maria",
      userEmail: "maria@student.com",
      userRole: "student",
      comment: "Essa técnica de entalhe contra as fibras mudou totalmente meu fluxo de trabalho!",
    });
    assert(comment.userName === "Student Maria", "Nome do autor do comentário deve coincidir");
    assert(comment.userRole === "student", "Role do autor deve ser student");
    assert(comment.replies && comment.replies.length === 0, "O comentário inicial deve ter zero respostas");
    Logger.info("✔ PASSED: Publicação de comentário de suporte na aula validada com sucesso");

    // Test reply to the comment
    const reply = await courseService.createComment({
      lessonId: testLessonId,
      courseId: testCourseId,
      userName: "Instructor Gilberto",
      userEmail: "gilberto@instructor.com",
      userRole: "admin",
      comment: "Excelente, Maria! Esse cuidado evita lascar madeiras moles.",
      parentCommentId: comment.id,
    });
    assert(reply.parentCommentId === comment.id, "ID do comentário pai deve coincidir");

    const updatedComment = await courseService.getComment(comment.id);
    assert(updatedComment.replies && updatedComment.replies.length === 1, "O comentário pai agora deve listar uma resposta");
    assert(updatedComment.replies[0].comment === reply.comment, "Conteúdo da resposta deve bater");
    Logger.info("✔ PASSED: Publicação de resposta aninhada de suporte validada com sucesso");

    // ----------------------------------------------------
    // TEST 6: Cascade deletion
    // ----------------------------------------------------
    await courseService.deleteCourse(testCourseId);

    // Verify course is gone
    let courseFound = false;
    try {
      await courseService.getCourse(testCourseId);
      courseFound = true;
    } catch {
      courseFound = false;
    }
    assert(!courseFound, "O curso deve ter sido removido");

    // Verify module is gone
    let moduleFound = false;
    try {
      await courseService.getModule(testModuleId);
      moduleFound = true;
    } catch {
      moduleFound = false;
    }
    assert(!moduleFound, "O módulo associado deve ter sido removido em cascata");

    // Verify lesson is gone
    let lessonFound = false;
    try {
      await courseService.getLesson(testLessonId);
      lessonFound = true;
    } catch {
      lessonFound = false;
    }
    assert(!lessonFound, "A aula associada deve ter sido removida em cascata");

    Logger.info("✔ PASSED: Remoção em cascata (Curso -> Módulo -> Aula) validada com 100% de precisão");

    Logger.info("========================================");
    Logger.info("  RESUMO DOS TESTES: Todos passaram! ");
    Logger.info("========================================");
  } catch (error: any) {
    Logger.error("❌ FALHA NOS TESTES DA FASE 2", error);
    process.exit(1);
  }
}

runCourseTests().then(() => process.exit(0));
