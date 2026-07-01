import { Request, Response, NextFunction } from "express";
import { HandoutService } from "../services/HandoutService";

export class HandoutController {
  private handoutService = new HandoutService();

  public async getHandout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const handout = await this.handoutService.getHandout(id);
      if (!handout) {
        res.status(404).json({ error: "Apostila não encontrada." });
        return;
      }
      res.status(200).json(handout);
    } catch (error) {
      next(error);
    }
  }

  public async listHandouts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const handouts = await this.handoutService.listHandouts();
      res.status(200).json(handouts);
    } catch (error) {
      next(error);
    }
  }

  public async createHandout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const handout = await this.handoutService.createHandout(req.body);
      res.status(200).json({ success: true, apostila: handout });
    } catch (error) {
      next(error);
    }
  }

  public async updateHandout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const handout = await this.handoutService.updateHandout(id, req.body);
      res.status(200).json({ success: true, apostila: handout });
    } catch (error) {
      next(error);
    }
  }

  public async deleteHandout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.handoutService.deleteHandout(id);
      res.status(200).json({ success: true, message: "Apostila excluída com sucesso." });
    } catch (error) {
      next(error);
    }
  }
}
