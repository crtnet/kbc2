import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { config } from '../config';
import { ObjectId } from 'mongodb';

class BookController {
  async createBook(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const bookData = {
        ...req.body,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info('Criando novo livro', { userId });

      const result = await req.db.collection('books').insertOne(bookData);

      logger.info('Livro criado com sucesso', { 
        bookId: result.insertedId, 
        userId 
      });

      res.status(201).json({
        id: result.insertedId,
        ...bookData
      });
    } catch (error) {
      logger.error('Erro ao criar livro', { 
        error: error.message,
        userId: req.user.id 
      });
      res.status(500).json({ error: 'Erro ao criar livro' });
    }
  }

  async getBooks(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      logger.info('Buscando livros do usuário', { userId });

      const books = await req.db.collection('books')
        .find({ userId })
        .toArray();

      logger.info('Livros obtidos com sucesso', { 
        userId, 
        booksCount: books.length 
      });

      res.json(books);
    } catch (error) {
      logger.error('Erro ao buscar livros', { 
        error: error.message,
        userId: req.user.id 
      });
      res.status(500).json({ error: 'Erro ao buscar livros' });
    }
  }

  async getBook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info('Buscando livro específico', { bookId: id, userId });

      const book = await req.db.collection('books').findOne({
        _id: new ObjectId(id),
        userId
      });

      if (!book) {
        logger.warn('Livro não encontrado', { bookId: id, userId });
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      logger.info('Livro obtido com sucesso', { bookId: id, userId });
      res.json(book);
    } catch (error) {
      logger.error('Erro ao buscar livro', { 
        error: error.message,
        bookId: req.params.id,
        userId: req.user.id 
      });
      res.status(500).json({ error: 'Erro ao buscar livro' });
    }
  }

  async updateBook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };

      logger.info('Atualizando livro', { bookId: id, userId });

      const result = await req.db.collection('books').updateOne(
        { 
          _id: new ObjectId(id), 
          userId 
        },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        logger.warn('Livro não encontrado para atualização', { bookId: id, userId });
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      logger.info('Livro atualizado com sucesso', { bookId: id, userId });
      res.json({ 
        id, 
        ...updateData 
      });
    } catch (error) {
      logger.error('Erro ao atualizar livro', { 
        error: error.message,
        bookId: req.params.id,
        userId: req.user.id 
      });
      res.status(500).json({ error: 'Erro ao atualizar livro' });
    }
  }

  async deleteBook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info('Excluindo livro', { bookId: id, userId });

      const result = await req.db.collection('books').deleteOne({
        _id: new ObjectId(id),
        userId
      });

      if (result.deletedCount === 0) {
        logger.warn('Livro não encontrado para exclusão', { bookId: id, userId });
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      // Tenta remover o PDF associado
      const pdfPath = path.join(config.pdfDirectory, `${id}.pdf`);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        logger.info('PDF do livro removido', { bookId: id });
      }

      logger.info('Livro excluído com sucesso', { bookId: id, userId });
      res.status(204).send();
    } catch (error) {
      logger.error('Erro ao excluir livro', { 
        error: error.message,
        bookId: req.params.id,
        userId: req.user.id 
      });
      res.status(500).json({ error: 'Erro ao excluir livro' });
    }
  }

  async getBookPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info('Solicitação de PDF recebida', { bookId: id, userId });

      // Verifica se o livro existe e pertence ao usuário
      const book = await req.db.collection('books').findOne({
        _id: new ObjectId(id),
        userId
      });

      if (!book) {
        logger.warn('Livro não encontrado ou acesso negado', { bookId: id, userId });
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      // Constrói o caminho do arquivo PDF
      const pdfPath = path.join(config.pdfDirectory, `${id}.pdf`);

      // Verifica se o arquivo existe
      if (!fs.existsSync(pdfPath)) {
        logger.warn('Arquivo PDF não encontrado', { bookId: id, pdfPath });
        return res.status(404).json({ error: 'PDF não encontrado' });
      }

      // Gera uma URL temporária para o PDF
      const pdfUrl = `${config.apiUrl}/pdfs/${id}.pdf`;

      logger.info('URL do PDF gerada com sucesso', { bookId: id, userId });

      res.json({ url: pdfUrl });
    } catch (error) {
      logger.error('Erro ao obter PDF do livro', {
        bookId: req.params.id,
        error: error.message
      });
      res.status(500).json({ error: 'Erro ao obter PDF do livro' });
    }
  }

  async getBookStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info('Verificando status do livro', { bookId: id, userId });

      // Verifica se o livro existe e pertence ao usuário
      const book = await req.db.collection('books').findOne({
        _id: new ObjectId(id),
        userId
      });

      if (!book) {
        logger.warn('Livro não encontrado ou acesso negado', { bookId: id, userId });
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      // Verifica se o PDF existe
      const pdfPath = path.join(config.pdfDirectory, `${id}.pdf`);
      const pdfExists = fs.existsSync(pdfPath);

      logger.info('Status do livro verificado', { 
        bookId: id, 
        userId,
        pdfExists,
        status: book.status 
      });

      res.json({
        status: book.status,
        pdfReady: pdfExists
      });
    } catch (error) {
      logger.error('Erro ao verificar status do livro', {
        bookId: req.params.id,
        error: error.message
      });
      res.status(500).json({ error: 'Erro ao verificar status do livro' });
    }
  }

  async getBookPDFViewer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info('Solicitação de visualizador de PDF recebida', { bookId: id, userId });

      // Verifica se o livro existe e pertence ao usuário
      const book = await req.db.collection('books').findOne({
        _id: new ObjectId(id),
        userId
      });

      if (!book) {
        logger.warn('Livro não encontrado ou acesso negado', { bookId: id, userId });
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      // Constrói o caminho do arquivo PDF
      const pdfPath = path.join(config.pdfDirectory, `${id}.pdf`);

      // Verifica se o arquivo existe
      if (!fs.existsSync(pdfPath)) {
        logger.warn('Arquivo PDF não encontrado', { bookId: id, pdfPath });
        return res.status(404).json({ error: 'PDF não encontrado' });
      }

      // Retorna a página do visualizador com o ID do livro
      res.render('pdf-viewer', { 
        bookId: id,
        title: book.title,
        pdfUrl: `/pdfs/${id}.pdf`
      });
    } catch (error) {
      logger.error('Erro ao carregar visualizador de PDF', {
        bookId: req.params.id,
        error: error.message
      });
      res.status(500).json({ error: 'Erro ao carregar visualizador de PDF' });
    }
  }
}

export default new BookController();