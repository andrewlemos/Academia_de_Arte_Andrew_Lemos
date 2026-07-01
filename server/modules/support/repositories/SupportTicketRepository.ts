import { firestoreDb } from "../../../config/firebase";
import { SupportTicket } from "../types";

export class SupportTicketRepository {
  private collection = firestoreDb.collection("supportTickets");
  private static mockDb = new Map<string, SupportTicket>();

  public async findById(id: string): Promise<SupportTicket | null> {
    if (process.env.NODE_ENV === "test") {
      const ticket = SupportTicketRepository.mockDb.get(id);
      return ticket ? { ...ticket } : null;
    }
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SupportTicket;
  }

  public async listAll(): Promise<SupportTicket[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(SupportTicketRepository.mockDb.values()).map(t => ({ ...t }));
    }
    const snapshot = await this.collection.get();
    const tickets: SupportTicket[] = [];
    snapshot.forEach((doc) => {
      tickets.push({ id: doc.id, ...doc.data() } as SupportTicket);
    });
    return tickets;
  }

  public async create(ticket: SupportTicket): Promise<SupportTicket> {
    if (process.env.NODE_ENV === "test") {
      SupportTicketRepository.mockDb.set(ticket.id, { ...ticket });
      return ticket;
    }
    await this.collection.doc(ticket.id).set(ticket);
    return ticket;
  }

  public async update(id: string, data: Partial<SupportTicket>): Promise<SupportTicket> {
    if (process.env.NODE_ENV === "test") {
      const existing = SupportTicketRepository.mockDb.get(id);
      if (!existing) {
        throw new Error(`Ticket com ID ${id} não pôde ser encontrado.`);
      }
      const updated = { ...existing, ...data };
      SupportTicketRepository.mockDb.set(id, updated);
      return updated;
    }
    await this.collection.doc(id).update(data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Ticket com ID ${id} não pôde ser encontrado.`);
    }
    return updated;
  }
}
