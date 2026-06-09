import { Router } from 'express';
import { certificateService } from '../services/certificateService';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const data = await certificateService.getAll();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'list failed' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q ?? '');
    const data = await certificateService.search(q);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'search failed' });
  }
});

router.get('/employee/:employeeId', async (req, res) => {
  try {
    const data = await certificateService.getByEmployeeId(String(req.params.employeeId ?? ''));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'getByEmployeeId failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await certificateService.getById(String(req.params.id ?? ''));
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'getById failed' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = await certificateService.create(req.body ?? {});
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'create failed' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = await certificateService.update(String(req.params.id ?? ''), req.body ?? {});
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'update failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await certificateService.delete(String(req.params.id ?? ''));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'delete failed' });
  }
});

export default router;
