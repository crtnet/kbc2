// src/routes/books.routes.ts
import { Router } from 'express';
import bookController from '../controllers/bookController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Todas as rotas de livros requerem autenticação
router.use(authMiddleware);

router.get('/', bookController.listBooks);
router.get('/:id', bookController.getBook);
router.post('/', bookController.createBook);

export default router;