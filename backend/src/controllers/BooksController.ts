import { Request, Response } from 'express';
import BookController from './BookController';

// Esse "wrapper" mapeia os métodos do BookController
export class BooksController {
  static async index(req: Request, res: Response) {
    return BookController.listBooks(req, res);
  }
  
  static async create(req: Request, res: Response) {
    return BookController.createBook(req, res);
  }
  
  static async show(req: Request, res: Response) {
    return BookController.getBook(req, res);
  }
  
  static async update(req: Request, res: Response) {
    // Se ainda não houver implementação para update, retorne 501 (Not Implemented)
    return res.status(501).json({ error: 'Update não implementado' });
  }
  
  static async delete(req: Request, res: Response) {
    // Se ainda não houver implementação para delete, retorne 501 (Not Implemented)
    return res.status(501).json({ error: 'Delete não implementado' });
  }
}

export default BooksController;