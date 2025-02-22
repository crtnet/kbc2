// src/controllers/BooksController.ts

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import BookController from './BookController';

/**
 * BooksController: um "wrapper" que mapeia os métodos de BookController,
 * possibilitando nomenclatura REST mais tradicional (index, create, show, update, delete).
 */
export class BooksController {
  /**
   * GET /books
   * Chama BookController.listBooks
   */
  static async index(req: Request, res: Response) {
    try {
      return await BookController.listBooks(req, res);
    } catch (error) {
      logger.error('Erro no BooksController.index:', error);
      return res.status(500).json({ error: 'Erro interno ao listar livros' });
    }
  }

  /**
   * POST /books
   * Chama BookController.createBook
   */
  static async create(req: Request, res: Response) {
    try {
      return await BookController.createBook(req, res);
    } catch (error) {
      logger.error('Erro no BooksController.create:', error);
      return res.status(500).json({ error: 'Erro interno ao criar livro' });
    }
  }

  /**
   * GET /books/:id
   * Chama BookController.getBook
   */
  static async show(req: Request, res: Response) {
    try {
      return await BookController.getBook(req, res);
    } catch (error) {
      logger.error('Erro no BooksController.show:', error);
      return res.status(500).json({ error: 'Erro interno ao obter livro' });
    }
  }

  /**
   * PUT/PATCH /books/:id
   * Ainda não implementado
   */
  static async update(req: Request, res: Response) {
    // Se ainda não houver implementação para update, retorne 501 (Not Implemented)
    return res.status(501).json({ error: 'Update não implementado' });
  }

  /**
   * DELETE /books/:id
   * Ainda não implementado
   */
  static async delete(req: Request, res: Response) {
    // Se ainda não houver implementação para delete, retorne 501 (Not Implemented)
    return res.status(501).json({ error: 'Delete não implementado' });
  }
}

export default BooksController;