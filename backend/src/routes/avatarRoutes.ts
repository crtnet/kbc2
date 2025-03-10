// src/routes/avatarRoutes.ts
import express from 'express';
import avatarController from '../controllers/avatarController';
import avatarCustomizationController from '../controllers/avatarCustomizationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas as rotas de avatar requerem autenticação
router.use(authMiddleware);

// Rotas para gerenciamento de avatares pré-definidos
router.get('/', avatarController.getAvatars);
router.get('/categories', avatarController.getCategories);
router.get('/styles', avatarController.getStyles);
router.post('/upload', avatarController.uploadAvatar);

// Rotas para gerenciamento de avatares personalizados
router.post('/custom', avatarCustomizationController.generateCustomAvatar);
router.post('/save', avatarCustomizationController.saveCustomAvatar);
router.get('/saved', avatarCustomizationController.getSavedAvatars);
router.get('/:avatarId/edit', avatarCustomizationController.getAvatarForEditing);
router.put('/:avatarId', avatarCustomizationController.updateAvatar);
router.delete('/:avatarId', avatarCustomizationController.deleteAvatar);

export default router;