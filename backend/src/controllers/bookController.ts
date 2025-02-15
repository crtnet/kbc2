import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import bookService from '../services/bookService';
import { Book } from '../models/Book';
import mongoose from 'mongoose';
import { config } from '../config';

class BookController {
  async listBooks(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      // Log apenas em desenvolvimento
      if (config.nodeEnv === 'development') {
        logger.info('Listagem de livros - Usuário autenticado:', { userId });
      }

      if (!userId) {
        logger.error('Usuário não autenticado na listagem de livros');
        return res.status(401).json({ 
          error: 'Não autorizado',
          details: 'Usuário não autenticado'
        });
      }

      // Verifica a conexão com o banco antes de fazer a query
      if (mongoose.connection.readyState !== 1) {
        logger.error('Banco de dados não conectado');
        return res.status(503).json({ 
          error: 'Serviço indisponível',
          details: 'Erro de conexão com o banco de dados'
        });
      }

      const books = await Book.find({ userId })
        .sort({ 'metadata.createdAt': -1 })
        .select('-pages.text')
        .lean()
        .exec();
      
      // Log apenas em desenvolvimento
      if (config.nodeEnv === 'development') {
        logger.info(`Livros encontrados para o usuário ${userId}:`, { count: books.length });
      }

      return res.json({
        success: true,
        data: books,
        count: books.length
      });
    } catch (error: any) {
      logger.error('Erro ao listar livros:', {
        error: error.message,
        stack: config.nodeEnv === 'development' ? error.stack : undefined,
        code: error.code
      });
      
      // Tratamento específico para erros do MongoDB
      if (error instanceof mongoose.Error) {
        return res.status(503).json({
          error: 'Erro no banco de dados',
          details: config.nodeEnv === 'development' ? error.message : 'Erro ao acessar o banco de dados'
        });
      }
      
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: config.nodeEnv === 'development' ? error.message : 'Erro ao processar a requisição'
      });
    }
  }

  async getBook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Log apenas em desenvolvimento
      if (config.nodeEnv === 'development') {
        logger.info('Busca de livro específico:', { bookId: id, userId });
      }

      if (!userId) {
        logger.error('Usuário não autenticado na busca de livro');
        return res.status(401).json({ 
          error: 'Não autorizado',
          details: 'Usuário não autenticado'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.error('ID de livro inválido', { bookId: id });
        return res.status(400).json({ 
          error: 'Requisição inválida',
          details: 'ID de livro inválido'
        });
      }

      // Verifica a conexão com o banco antes de fazer a query
      if (mongoose.connection.readyState !== 1) {
        logger.error('Banco de dados não conectado');
        return res.status(503).json({ 
          error: 'Serviço indisponível',
          details: 'Erro de conexão com o banco de dados'
        });
      }

      const book = await Book.findOne({ _id: id, userId });
      
      if (!book) {
        logger.error('Livro não encontrado', { bookId: id, userId });
        return res.status(404).json({ 
          error: 'Não encontrado',
          details: 'Livro não encontrado'
        });
      }

      return res.json({
        success: true,
        data: book
      });
    } catch (error: any) {
      logger.error('Erro ao buscar livro:', {
        error: error.message,
        stack: config.nodeEnv === 'development' ? error.stack : undefined,
        code: error.code
      });
      
      // Tratamento específico para erros do MongoDB
      if (error instanceof mongoose.Error) {
        return res.status(503).json({
          error: 'Erro no banco de dados',
          details: config.nodeEnv === 'development' ? error.message : 'Erro ao acessar o banco de dados'
        });
      }
      
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: config.nodeEnv === 'development' ? error.message : 'Erro ao processar a requisição'
      });
    }
  }

  async createBook(req: Request, res: Response) {
    try {
      const { 
        title, 
        prompt, 
        ageRange, 
        authorName,
        theme = 'default',
        language = 'pt-BR'
      } = req.body;

      // Log apenas em desenvolvimento
      if (config.nodeEnv === 'development') {
        logger.info('Requisição de criação de livro recebida:', {
          title,
          ageRange,
          theme,
          language
        });
      }

      // Validações dos campos obrigatórios
      if (!title || !prompt || !ageRange || !authorName) {
        logger.error('Dados inválidos na requisição', { 
          title: !!title,
          prompt: !!prompt,
          ageRange: !!ageRange,
          authorName: !!authorName
        });
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: 'Todos os campos são obrigatórios: title, prompt, ageRange, authorName'
        });
      }

      // Validação da faixa etária
      const validAgeRanges = ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'];
      if (!validAgeRanges.includes(ageRange)) {
        logger.error('Faixa etária inválida', { ageRange });
        return res.status(400).json({
          error: 'Dados inválidos',
          details: `A faixa etária deve ser uma das seguintes: ${validAgeRanges.join(', ')}`
        });
      }

      const userId = req.user?.id;
      
      if (!userId) {
        logger.error('Usuário não autenticado na criação de livro');
        return res.status(401).json({ 
          error: 'Não autorizado',
          details: 'Usuário não autenticado'
        });
      }

      // Verifica a conexão com o banco antes de criar o livro
      if (mongoose.connection.readyState !== 1) {
        logger.error('Banco de dados não conectado');
        return res.status(503).json({ 
          error: 'Serviço indisponível',
          details: 'Erro de conexão com o banco de dados'
        });
      }

      // Criar livro usando o serviço
      const book = await bookService.createBook({
        title,
        prompt,
        ageRange,
        authorName,
        userId,
        theme,
        language
      });

      // Log apenas em desenvolvimento
      if (config.nodeEnv === 'development') {
        logger.info('Livro criado com sucesso', { 
          bookId: book._id,
          status: book.status
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Livro criado com sucesso, gerando imagens...',
        data: {
          bookId: book._id,
          status: book.status,
          pages: book.pages.length
        }
      });

    } catch (error: any) {
      logger.error('Erro ao criar livro:', {
        error: error.message,
        stack: config.nodeEnv === 'development' ? error.stack : undefined,
        name: error.name,
        code: error.code
      });
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Erro de validação',
          details: error.message
        });
      }
      
      if (error instanceof mongoose.Error) {
        return res.status(503).json({
          error: 'Erro no banco de dados',
          details: config.nodeEnv === 'development' ? error.message : 'Erro ao salvar no banco de dados'
        });
      }
      
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: config.nodeEnv === 'development' ? error.message : 'Erro ao processar a requisição'
      });
    }
  }
}

export default new BookController();