import { Request, Response } from 'express';
import Book from '../models/Book';
import * as openaiService from '../services/openai';

// Função para criar livro
export const createBook = async (req: Request, res: Response) => {
  try {
    const { title, genre, theme, mainCharacter, setting, tone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.error('User ID não encontrado no request');
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    console.log('Criando livro:', {
      title,
      genre,
      theme,
      mainCharacter,
      setting,
      tone,
      userId
    });

    // Validar campos obrigatórios
    if (!title || !genre || !theme || !mainCharacter || !setting || !tone) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    const book = new Book({
      title,
      author: userId,
      genre,
      theme,
      mainCharacter,
      setting,
      tone,
      status: 'generating'
    });

    await book.save();
    console.log('Livro criado:', book._id);

    // Iniciar geração em background
    generateBookContent(book._id).catch(err => {
      console.error('Erro na geração em background:', err);
    });

    res.status(201).json({
      message: 'Livro criado com sucesso! O conteúdo está sendo gerado.',
      bookId: book._id
    });
  } catch (error) {
    console.error('Erro ao criar livro:', error);
    res.status(500).json({ message: 'Erro ao criar livro' });
  }
};

// Função para buscar um livro específico
export const getBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      console.error('User ID não encontrado no request');
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const book = await Book.findById(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Livro não encontrado' });
    }

    if (book.author.toString() !== userId) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    res.json(book);
  } catch (error) {
    console.error('Erro ao buscar livro:', error);
    res.status(500).json({ message: 'Erro ao buscar livro' });
  }
};

// Função para listar livros do usuário
export const getUserBooks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.error('User ID não encontrado no request');
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const books = await Book.find({ author: userId })
      .sort({ createdAt: -1 })
      .select('-content.story');
    
    res.json(books);
  } catch (error) {
    console.error('Erro ao buscar livros:', error);
    res.status(500).json({ message: 'Erro ao buscar livros' });
  }
};

// Função para gerar conteúdo do livro
async function generateBookContent(bookId: string) {
  try {
    console.log('Iniciando geração de conteúdo para o livro:', bookId);
    
    const book = await Book.findById(bookId);
    if (!book) {
      console.error('Livro não encontrado:', bookId);
      return;
    }

    // Gerar história
    console.log('Gerando história...');
    const story = await openaiService.generateStory(book);
    const pages = story.split('\n\n').filter(Boolean).map(text => ({ text, imageUrl: '' }));

    // Gerar imagens
    console.log('Gerando imagens...');
    for (let i = 0; i < pages.length; i++) {
      pages[i].imageUrl = await openaiService.generateImage(pages[i].text);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Respeitar rate limit
    }

    // Atualizar livro
    book.content = { story, pages };
    book.status = 'completed';
    await book.save();

    console.log('Livro gerado com sucesso:', bookId);
  } catch (error) {
    console.error('Erro ao gerar conteúdo:', error);
    
    const book = await Book.findById(bookId);
    if (book) {
      book.status = 'failed';
      await book.save();
    }
  }
}