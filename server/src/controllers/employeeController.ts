import type { Request, Response } from 'express';
import { employeeService } from '../services/employeeService';

export const employeeController = {
  async getAll(req: Request, res: Response) {
    try {
      const { data, count } = await employeeService.getAll();
      res.json({ data, count });
    } catch (error: any) {
      console.error('Error in employeeController.getAll:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const data = await employeeService.getById(id);
      if (!data) return res.status(404).json({ error: 'Employee not found' });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async search(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      const data = await employeeService.search(query || '');
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await employeeService.create(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const data = await employeeService.update(id, req.body);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      await employeeService.delete(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
