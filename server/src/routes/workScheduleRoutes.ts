import { Router } from 'express';
import { workScheduleController } from '../controllers/workScheduleController';

const router = Router();

router.get('/', workScheduleController.list);
router.get('/:id', workScheduleController.getById);
router.post('/', workScheduleController.create);
router.put('/:id', workScheduleController.update);
router.delete('/:id', workScheduleController.remove);

export default router;
