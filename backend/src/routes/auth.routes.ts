import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const authController = new AuthController();

// Rotas públicas
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

// Rotas protegidas
router.get('/verify', authMiddleware, (req, res) => AuthController.verifyToken(req, res));
router.post('/refresh-token', (req, res) => AuthController.refreshToken(req, res));

export default router;