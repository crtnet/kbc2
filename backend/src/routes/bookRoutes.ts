import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import BookController from '../controllers/bookController';
import PDFController from '../controllers/pdfController';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Erro no token' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Adiciona o usuário decodificado ao request
    req.user = decoded as { id: string };
    
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const router = Router();

// Rotas de livros
router.post('/', auth, BookController.createBook);
router.get('/', auth, BookController.getBooks);
router.get('/:id', auth, BookController.getBook);
router.put('/:id', auth, BookController.updateBook);
router.delete('/:id', auth, BookController.deleteBook);

router.get('/:id/status', auth, BookController.getBookStatus);

export default router;