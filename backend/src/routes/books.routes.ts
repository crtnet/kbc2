import { Router } from 'express';
import { BooksController } from '../controllers/BooksController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Todas as rotas de livros requerem autenticação
router.use(authMiddleware);

router.get('/', BooksController.index);
router.post('/', BooksController.create);
router.get('/:id', BooksController.show);
router.put('/:id', BooksController.update);
router.delete('/:id', BooksController.delete);

export default router;