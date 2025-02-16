import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Rotas públicas
router.post('/register', (req, res) => AuthController.register(req, res));
router.post('/login', (req, res) => AuthController.login(req, res));

// Rotas protegidas
router.get('/verify', authMiddleware, (req, res) => AuthController.verifyToken(req, res));
router.post('/refresh-token', (req, res) => AuthController.refreshToken(req, res));

export default router;