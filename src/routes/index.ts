import { Router } from 'express';
import BookController from '../controllers/bookController';

const router = Router();

// Rotas de livros
router.post('/books', BookController.createBook);
router.get('/books', BookController.getAllBooks);
router.get('/books/:id', BookController.getBook);
router.put('/books/:id', BookController.updateBook);
router.delete('/books/:id', BookController.deleteBook);
router.post('/books/:id/generate', BookController.generateBook);

export default router;