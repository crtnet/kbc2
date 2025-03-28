// src/routes/bookRoutes.ts

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import bookController from '../controllers/bookController';
import { bookAsyncController } from '../controllers/bookAsync.controller';

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
 * POST /books/async
 * Cria um novo livro de forma assíncrona
 */
router.post('/async', bookAsyncController.createBookAsync);

/**
 * GET /books/:bookId/status
 * Verifica o status de um livro em processamento
 */
router.get('/:bookId/status', bookAsyncController.checkBookStatus);

/**
 * POST /books/:bookId/generate-pdf
 * Gera o PDF do livro (se o usuário for dono)
 */
router.post('/:bookId/generate-pdf', bookController.generatePDF);

/**
 * GET /books/:bookId/pdf
 * Retorna o PDF do livro (se o usuário for dono)
 */
router.get('/:bookId/pdf', bookController.getPDF);

/**
 * DELETE /books/:bookId
 * Remove um livro (se o usuário for dono)
 */
router.delete('/:bookId', bookController.deleteBook);

export default router;