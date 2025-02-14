import { Router, Request, Response } from 'express';
import AuthController from '../controllers/AuthController';
import { auth } from './bookRoutes'; // Importar middleware de autenticação

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/verify', auth, AuthController.verifyToken); // Nova rota de verificação

export default router;