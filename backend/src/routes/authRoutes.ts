import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const authController = new AuthController();

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rotas protegidas
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/me', authMiddleware, authController.updateUser);
router.delete('/me', authMiddleware, authController.deleteUser);

export default router;