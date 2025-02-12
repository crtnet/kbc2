// backend/src/routes/bookRoutes.ts
import express from 'express';
import * as bookController from '../controllers/bookController';
import { authMiddleware } from '../middlewares/auth';

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Definir as rotas
router.post('/', bookController.createBook);
router.get('/:id', bookController.getBook);
router.get('/', bookController.getUserBooks);

export default router;