import { SupportTicketRepository } from "../repositories/SupportTicketRepository";
import { SupportTicket } from "../types";

export class SupportService {
  private ticketRepository = new SupportTicketRepository();

  public async getTicket(id: string): Promise<SupportTicket | null> {
    return this.ticketRepository.findById(id);
  }

  public async listTickets(): Promise<SupportTicket[]> {
    return this.ticketRepository.listAll();
  }

  public async createTicket(data: Partial<SupportTicket>): Promise<SupportTicket> {
    const id = data.id || `ticket_${Date.now()}`;
    const ticket: SupportTicket = {
      id,
      studentId: data.studentId || "",
      studentName: data.studentName || "",
      studentEmail: data.studentEmail || "",
      courseId: data.courseId || "",
      lessonId: data.lessonId || "",
      lessonTitle: data.lessonTitle || "",
      queryText: data.queryText || "",
      imageUrl: data.imageUrl || "",
      type: data.type || "question",
      createdAt: new Date().toISOString(),
    };
    return this.ticketRepository.create(ticket);
  }

  public async answerTicket(id: string, answerText: string): Promise<SupportTicket> {
    return this.ticketRepository.update(id, {
      answerText,
      answeredAt: new Date().toISOString(),
    });
  }
}
