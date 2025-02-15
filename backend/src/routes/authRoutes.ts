import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { auth } from './bookRoutes'; // Verifique se o middleware de autenticação está definido corretamente

const router = Router();

// Rota para registro de usuário
router.post('/register', AuthController.register);

// Rota para login de usuário
router.post('/login', AuthController.login);

// Rota para verificação do token (proteção com middleware de autenticação)
router.get('/verify', auth, AuthController.verifyToken);

export default router;