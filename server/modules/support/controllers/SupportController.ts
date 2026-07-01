import { Request, Response, NextFunction } from "express";
import { SupportService } from "../services/SupportService";

export class SupportController {
  private supportService = new SupportService();

  public async getTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ticket = await this.supportService.getTicket(id);
      if (!ticket) {
        res.status(404).json({ error: "Ticket não encontrado." });
        return;
      }
      res.status(200).json(ticket);
    } catch (error) {
      next(error);
    }
  }

  public async listTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tickets = await this.supportService.listTickets();
      res.status(200).json(tickets);
    } catch (error) {
      next(error);
    }
  }

  public async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await this.supportService.createTicket(req.body);
      res.status(200).json({ success: true, ticket });
    } catch (error) {
      next(error);
    }
  }

  public async answerTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { answerText } = req.body;
      const ticket = await this.supportService.answerTicket(id, answerText);
      res.status(200).json({ success: true, ticket });
    } catch (error) {
      next(error);
    }
  }
}
