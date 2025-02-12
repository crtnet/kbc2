import { Router } from 'express';
import { BookController } from '../controllers/bookController';
import logger from '../utils/logger';

const router = Router();
const bookController = new BookController();

// Rota para criar livro
router.post('/', (req, res) => bookController.createBook(req, res));

// Rota para buscar livro
router.get('/:id', (req, res) => bookController.getBook(req, res));

// Rota para gerar PDF
router.post('/:id/pdf', (req, res) => bookController.generatePdf(req, res));

// Rota para verificar status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`[INÍCIO] Verificando status do livro ${id}`);
    
    const book = await bookController['bookService'].getBook(id);
    
    const status = {
      bookId: id,
      status: book.status,
      hasImages: book.pages.every(page => page.imageUrl),
      hasPdf: !!book.pdfUrl,
      pagesCount: book.pages.length,
      lastUpdated: book.updatedAt
    };
    
    logger.info(`[FIM] Status do livro ${id}:`, status);
    res.json(status);
  } catch (error) {
    logger.error('[ERRO] Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status do livro' });
  }
});

export default router;