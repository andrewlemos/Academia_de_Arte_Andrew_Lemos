import { Request, Response, NextFunction } from "express";
import { GeminiService } from "../services/GeminiService";

export class GeminiController {
  private geminiService = new GeminiService();

  public async askTutor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonTitle, query } = req.body;
      const answer = await this.geminiService.getTutorAnswer(lessonTitle, query);
      res.status(200).json({ answer });
    } catch (error) {
      next(error);
    }
  }

  public async generateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonTitle, lessonDescription, lessonText } = req.body;
      const quiz = await this.geminiService.generateQuiz(lessonTitle, lessonDescription, lessonText);
      res.status(200).json(quiz);
    } catch (error) {
      next(error);
    }
  }

  public async answerTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketQueryText, lessonTitle, isPractical, imageUrl } = req.body;
      const draft = await this.geminiService.generateAnswerTicket(ticketQueryText, lessonTitle, isPractical, imageUrl);
      res.status(200).json({ draft });
    } catch (error) {
      next(error);
    }
  }

  public async generateSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonTitle, lessonText } = req.body;
      const summary = await this.geminiService.generateSummary(lessonTitle, lessonText);
      res.status(200).json({ summary });
    } catch (error) {
      next(error);
    }
  }

  public async suggestExercises(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonTitle, lessonText } = req.body;
      const exercises = await this.geminiService.suggestExercises(lessonTitle, lessonText);
      res.status(200).json({ exercises });
    } catch (error) {
      next(error);
    }
  }

  public async generateComplementaryMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonTitle, lessonText } = req.body;
      const material = await this.geminiService.generateComplementaryMaterial(lessonTitle, lessonText);
      res.status(200).json({ material });
    } catch (error) {
      next(error);
    }
  }

  public async correctAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonTitle, lessonText, question, userAnswer } = req.body;
      const correction = await this.geminiService.correctAnswer(lessonTitle, lessonText, question, userAnswer);
      res.status(200).json({ correction });
    } catch (error) {
      next(error);
    }
  }
}
