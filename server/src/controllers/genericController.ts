import type { Request, Response } from 'express';

export const createGenericController = (service: any) => ({
  async getAll(req: Request, res: Response) {
    try {
      const isPaged = req.query.page !== undefined;
      const options = {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        search: req.query.search as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        trangThai: req.query.trangThai as string | undefined,
      };
      const result = await service.getAll(options);
      
      if (isPaged) {
        res.json(result);
      } else {
        // Backward compatibility: return only the array if not paged
        res.json(result.data || result);
      }
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
