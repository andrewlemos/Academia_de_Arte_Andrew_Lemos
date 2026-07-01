import { HandoutRepository } from "../repositories/HandoutRepository";
import { Handout } from "../types";

export class HandoutService {
  private handoutRepository = new HandoutRepository();

  public async getHandout(id: string): Promise<Handout | null> {
    return this.handoutRepository.findById(id);
  }

  public async listHandouts(): Promise<Handout[]> {
    return this.handoutRepository.listAll();
  }

  public async createHandout(data: Partial<Handout>): Promise<Handout> {
    const id = data.id || `ebook_${Date.now()}`;
    const handout: Handout = {
      id,
      title: data.title || "",
      description: data.description || "",
      longDescription: data.longDescription || "",
      coverUrl: data.coverUrl || "",
      price: data.price || 0,
      chapters: data.chapters || [],
      status: data.status || "ativo",
    };
    return this.handoutRepository.create(handout);
  }

  public async updateHandout(id: string, data: Partial<Handout>): Promise<Handout> {
    return this.handoutRepository.update(id, data);
  }

  public async deleteHandout(id: string): Promise<void> {
    return this.handoutRepository.delete(id);
  }
}
