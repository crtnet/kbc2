import { Request, Response } from "express";
import Book from "../models/book";
import logger from "../utils/logger";

class BookController {
    public static async getBooks(req: Request, res: Response) {
        try {
            const books = await Book.find();
            return res.status(200).json(books);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar livros" });
        }
    }

    public static async getBook(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const book = await Book.findById(id);
            
            if (!book) {
                return res.status(404).json({ message: "Livro não encontrado" });
            }
            
            return res.status(200).json(book);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar livro" });
        }
    }

    public static async createBook(req: Request, res: Response) {
        try {
            const book = await Book.create(req.body);
            logger.info(`Novo livro criado: ${book.title}`);
            return res.status(201).json(book);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao criar livro" });
        }
    }

    public static async updateBook(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const book = await Book.findByIdAndUpdate(id, req.body, { new: true });
            
            if (!book) {
                return res.status(404).json({ message: "Livro não encontrado" });
            }
            
            logger.info(`Livro atualizado: ${book.title}`);
            return res.status(200).json(book);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao atualizar livro" });
        }
    }

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