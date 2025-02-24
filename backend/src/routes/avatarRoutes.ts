import { Router } from 'express';
import { avatarController } from '../controllers/avatarController';

const router = Router();

// Rota para upload de avatar
router.post('/upload', avatarController.uploadAvatar);

// Rota para recuperar avatar
router.get('/:filePath', avatarController.getAvatar);

export default router;