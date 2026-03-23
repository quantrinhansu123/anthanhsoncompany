import { Router } from 'express';
import { createGenericController } from '../controllers/genericController';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { contractService } from '../services/contractService';
import { aiService } from '../services/aiService';
import employeeRoutes from './employeeRoutes';
import workScheduleRoutes from './workScheduleRoutes';

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

// Generic CRUD routes
const projectController = createGenericController(projectService);
const taskController = createGenericController(taskService);
const contractController = createGenericController(contractService);

// Projects
router.get('/projects', projectController.getAll);
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
router.post('/contracts', contractController.create);
router.put('/contracts/:id', contractController.update);
router.delete('/contracts/:id', contractController.delete);

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
