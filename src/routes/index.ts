import { Router } from 'express';
import BookController from '../controllers/BookController';

const router = Router();

// Rotas de livros
router.get('/books', BookController.getBooks);
router.get('/books/:id', BookController.getBook);
router.post('/books', BookController.createBook);
router.put('/books/:id', BookController.updateBook);
router.delete('/books/:id', BookController.deleteBook);

export default router;