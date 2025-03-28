import { Router } from 'express';
import { bookController } from '../controllers/book.controller';
import { bookFixController } from '../controllers/bookFix.controller';
import { bookAsyncController } from '../controllers/bookAsync.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Rotas protegidas por autenticação
router.use(authMiddleware);

// Rotas originais
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);
router.post('/', bookController.createBook);
router.put('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

// Rota corrigida para criação de livros
router.post('/fixed', bookFixController.createBook);

// Novas rotas assíncronas
router.post('/async', bookAsyncController.createBookAsync);
router.get('/:id/status', bookAsyncController.checkBookStatus);

export default router;