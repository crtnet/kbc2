import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import BookController from '../controllers/BookController';
import PDFController from '../controllers/pdfController';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.error('Token não fornecido');
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    console.error('Erro no token: formato inválido');
    return res.status(401).json({ error: 'Erro no token' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    console.error('Token mal formatado');
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  try {
    // Aqui, config.jwtSecret deve estar definido (importado via named export)
    const decoded = jwt.verify(token, config.jwtSecret);
    console.log('Token decodificado com sucesso:', decoded);
    
    // Adiciona o usuário decodificado ao request (ajuste conforme o seu payload)
    req.user = decoded as { id: string };
    
    return next();
  } catch (err) {
    console.error('Token inválido ou expirado:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const router = Router();

// Rotas de livros (todas protegidas pelo middleware auth)
router.post('/', auth, BookController.createBook);
router.get('/', auth, BookController.getBooks);
router.get('/:id', auth, BookController.getBook);
router.put('/:id', auth, BookController.updateBook);
router.delete('/:id', auth, BookController.deleteBook);

// Rotas específicas para PDF
router.get('/:id/status', auth, BookController.getBookStatus);
router.get('/:id/pdf', auth, BookController.getBookPDF);
router.get('/:id/pdf-viewer', auth, BookController.getBookPDFViewer);

export default router;