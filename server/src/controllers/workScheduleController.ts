import type { Request, Response } from 'express';
import { workScheduleService } from '../services/workScheduleService';

export const workScheduleController = {
  async list(req: Request, res: Response) {
    try {
      const from = req.query.from as string;
      const to = req.query.to as string;
      const nhanSuId = (req.query.nhan_su_id as string) || undefined;
      if (!from || !to) {
        return res.status(400).json({ error: 'Tham số from và to (YYYY-MM-DD) là bắt buộc' });
      }
      const data = await workScheduleService.getByRange(from, to, nhanSuId);
      res.json({ data });
    } catch (error: any) {
      console.error('workScheduleController.list:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const row = await workScheduleService.getById(id);
      if (!row) return res.status(404).json({ error: 'Không tìm thấy' });
      res.json(row);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await workScheduleService.create(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await workScheduleService.update(id, req.body);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await workScheduleService.delete(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
