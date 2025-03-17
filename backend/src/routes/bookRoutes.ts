// src/routes/bookRoutes.ts

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import bookController from '../controllers/bookController';

const router = Router();

// Aplica o middleware de autenticação para todas as rotas
router.use(authMiddleware);

/**
 * GET /books
 * Lista todos os livros do usuário autenticado
 */
router.get('/', bookController.listBooks);

/**
 * GET /books/:bookId
 * Retorna dados de um livro específico (que pertença ao usuário)
 */
router.get('/:bookId', bookController.getBook);

/**
 * POST /books
 * Cria um novo livro
 */
router.post('/', bookController.createBook);

/**
 * GET /books/:bookId/pdf
 * Retorna o PDF do livro (se o usuário for dono)
 */
router.get('/:bookId/pdf', bookController.getPDF);

/**
 * DELETE /books/:bookId
 * Exclui um livro específico (que pertença ao usuário)
 */
router.delete('/:bookId', bookController.deleteBook);

export default router;