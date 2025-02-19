// src/routes/books.routes.ts
import { Router } from 'express';
import bookController from '../controllers/bookController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Todas as rotas de livros requerem autenticação
router.use(authMiddleware);

/**
 * GET /books
 * Lista todos os livros do usuário (ou de acordo com sua lógica)
 */
router.get('/', bookController.listBooks);

/**
 * GET /books/:bookId
 * Retorna dados de um livro específico
 */
router.get('/:bookId', bookController.getBook);

/**
 * POST /books
 * Cria um novo livro
 */
router.post('/', bookController.createBook);

/**
 * GET /books/:bookId/pdf
 * Retorna o PDF do livro
 */
router.get('/:bookId/pdf', bookController.getPDF);

export default router;