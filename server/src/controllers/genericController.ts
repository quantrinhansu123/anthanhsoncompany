import type { Request, Response } from 'express';

export const createGenericController = (service: any) => ({
  async getAll(req: Request, res: Response) {
    try {
      const data = await service.getAll();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await service.getById(id);
      if (!data) return res.status(404).json({ error: 'Not found' });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await service.create(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await service.update(id, req.body);
      if (!data) return res.status(404).json({ error: 'Not found or update failed' });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await service.delete(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
});
