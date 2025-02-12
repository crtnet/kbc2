import { Request, Response } from "express";
import Book from "../models/book";
import logger from "../utils/logger";

class BookController {
    public static async deleteBook(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const book = await Book.findByIdAndDelete(id);
            
            if (!book) {
                return res.status(404).json({ message: "Livro não encontrado" });
            }
            
            logger.info(`Livro deletado: ${book.title}`);
            return res.status(200).json(book);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao deletar livro" });
        }
    }
}

export default BookController;