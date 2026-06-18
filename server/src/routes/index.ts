import { Router } from 'express';
import { createGenericController } from '../controllers/genericController';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { contractService } from '../services/contractService';
import { customerService } from '../services/customerService';
import { thuChiService } from '../services/thuChiService';
import { aiService } from '../services/aiService';
import employeeRoutes from './employeeRoutes';
import workScheduleRoutes from './workScheduleRoutes';
import excelRoutes from './excelRoutes';
import storageRoutes from './storageRoutes';
import certificateRoutes from './certificateRoutes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

router.post('/ai', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await aiService.generateResponse(text);
    res.json({ response });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Employee routes are specialized (has search)
router.use('/employees', employeeRoutes);
router.use('/work-schedules', workScheduleRoutes);
router.use('/excel', excelRoutes);
router.use('/storage', storageRoutes);
router.use('/certificates', certificateRoutes);

// Generic CRUD routes
const projectController = createGenericController(projectService);
const taskController = createGenericController(taskService);
const contractController = createGenericController(contractService);
const customerController = createGenericController(customerService);

// Customers (service role — tránh RLS client trên khach_hang)
router.get('/customers', customerController.getAll);
router.get('/customers/:id', customerController.getById);
router.post('/customers', customerController.create);
router.put('/customers/:id', customerController.update);
router.delete('/customers/all', async (req, res) => {
  try {
    const { deleted } = await customerService.deleteAll();
    res.json({ deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/customers/by-names', async (req, res) => {
  try {
    const { names } = req.body;
    const data = await customerService.getByNames(Array.isArray(names) ? names : []);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/customers/delete-many', async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await customerService.deleteMany(Array.isArray(ids) ? ids : []);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/customers/:id', customerController.delete);

// Projects
router.get('/projects', projectController.getAll);
router.post('/projects/by-names', async (req, res) => {
  try {
    const { names } = req.body;
    const data = await projectService.getByNames(names);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/projects/:id', projectController.getById);
router.post('/projects', projectController.create);
router.put('/projects/:id', projectController.update);
router.delete('/projects/:id', projectController.delete);

// Tasks
router.get('/tasks', taskController.getAll);
router.get('/tasks/contract/:id', async (req, res) => {
  try {
    const data = await taskService.getByHopDongId(req.params.id as string);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/tasks', taskController.create);
router.put('/tasks/:id', taskController.update);
router.delete('/tasks/:id', taskController.delete);

// Contracts
router.get('/contracts', contractController.getAll);
router.get('/contracts/:id', contractController.getById);
router.post('/contracts', contractController.create);
router.put('/contracts/:id', contractController.update);
router.delete('/contracts/all', async (req, res) => {
  try {
    const { deleted } = await contractService.deleteAll();
    res.json({ deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'deleteAll failed' });
  }
});
router.delete('/contracts/:id', contractController.delete);
router.post('/contracts/bulk-import', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'rows must be an array' });
    }
    const result = await contractService.bulkImport(rows);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/contracts/sync-financials', async (req, res) => {
  try {
    const updates = req.body?.updates;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be an array' });
    }
    if (updates.length > 500) {
      return res.status(400).json({ error: 'Tối đa 500 HĐ mỗi lần đồng bộ.' });
    }
    const result = await contractService.syncFinancials(updates);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'sync-financials failed' });
  }
});

// Thu chi (service role — tránh RLS client)
router.get('/thu-chi', async (req, res) => {
  try {
    const duAnId = (req.query.du_an_id as string) || null;
    const data = await thuChiService.list(duAnId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'list failed' });
  }
});

router.post('/thu-chi', async (req, res) => {
  try {
    const data = await thuChiService.create(req.body ?? {});
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'create failed' });
  }
});

router.post('/thu-chi/bulk', async (req, res) => {
  try {
    const rows = req.body?.rows ?? req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'rows must be an array' });
    }
    const result = await thuChiService.createMany(rows);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'bulk create failed' });
  }
});

router.put('/thu-chi/:id', async (req, res) => {
  try {
    const data = await thuChiService.update(String(req.params.id ?? ''), req.body ?? {});
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'update failed' });
  }
});

router.delete('/thu-chi/all', async (_req, res) => {
  try {
    const { deleted } = await thuChiService.deleteAll();
    res.json({ deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'deleteAll failed' });
  }
});

router.post('/thu-chi/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array' });
    }
    const result = await thuChiService.deleteMany(ids);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'bulk-delete failed' });
  }
});

router.post('/thu-chi/migrate-chu-dau-tu-thanh-toan', async (_req, res) => {
  try {
    const result = await thuChiService.migrateChuDauTuThanhToan();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'migrate failed' });
  }
});

router.delete('/thu-chi/:id', async (req, res) => {
  try {
    await thuChiService.delete(String(req.params.id ?? ''));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'delete failed' });
  }
});

// Google Docs Export Proxy
router.post('/contracts/export-google-docs', async (req, res) => {
  try {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!scriptUrl) {
      return res.status(500).json({ error: 'GOOGLE_APPS_SCRIPT_URL not configured on server' });
    }

    console.log('[Server Proxy] Sending to Google...', scriptUrl);
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    console.log('[Server Proxy] Google Response Status:', response.status);
    const text = await response.text();
    console.log('[Server Proxy] Google Response Body:', text);

    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch (parseErr) {
      console.error('[Server Proxy] Failed to parse JSON:', text);
      res.status(500).json({ error: 'Failed to parse response from Google', details: text });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
