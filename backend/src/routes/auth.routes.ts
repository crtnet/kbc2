import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Rotas públicas
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Rotas protegidas
router.get('/verify', authMiddleware, AuthController.verifyToken);
router.post('/refresh-token', authMiddleware, AuthController.verifyToken);

export default router;