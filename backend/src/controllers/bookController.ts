import { Request, Response } from 'express';
import Book, { IBook } from '../models/Book';
import OpenAIService from '../services/openai';
import StoryGeneratorService from '../services/storyGenerator';
import { logger } from '../utils/logger';

export class BookController {
  public static async deleteBook(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const book = await Book.findOneAndDelete({ 
        _id: id, 
        userId: req.user?.id 
      });

      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      logger.info(`Livro deletado: ${book.title}`);

      return res.status(200).json({ 
        message: 'Livro deletado com sucesso',
        book: {
          id: book._id,
          title: book.title
        }
      });
    } catch (error) {
      logger.error(`Erro ao deletar livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao deletar livro', 
        details: error.message 
      });
    }
  }

  public static async createBook(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        title, 
        genre, 
        theme, 
        mainCharacter, 
        setting, 
        tone,
        ageRange,
        language = 'pt-BR'
      } = req.body;

      console.log('Dados recebidos para criação do livro:', req.body);

      // Validar dados de entrada
      const validationErrors: string[] = [];
      
      if (!title) validationErrors.push('Título é obrigatório');
      if (!genre) validationErrors.push('Gênero é obrigatório');
      if (!theme) validationErrors.push('Tema é obrigatório');
      if (!mainCharacter) validationErrors.push('Personagem principal é obrigatório');
      if (!setting) validationErrors.push('Cenário é obrigatório');
      if (!tone) validationErrors.push('Tom é obrigatório');
      if (!ageRange) validationErrors.push('Faixa etária é obrigatória');

      // Validar faixa etária
      const validAgeRanges: string[] = ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'];
      if (ageRange && !validAgeRanges.includes(ageRange)) {
        validationErrors.push(`Faixa etária inválida. Valores válidos: ${validAgeRanges.join(', ')}`);
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Dados inválidos', 
          details: validationErrors 
        });
      }

      // Gerar história usando o novo serviço
      const storyPrompt = `Crie uma história infantil com os seguintes elementos:
        - Título: ${title}
        - Gênero: ${genre}
        - Tema: ${theme}
        - Personagem Principal: ${mainCharacter}
        - Cenário: ${setting}
        - Tom: ${tone}
        - Idioma: ${language}
      `;

      let { story: storyText, wordCount } = await StoryGeneratorService.generateStory(
        storyPrompt, 
        ageRange
      );

      // Criar livro
      const book = new Book({
        title,
        userId: req.user?.id,
        genre,
        theme,
        mainCharacter,
        setting,
        tone,
        ageRange,
        pages: [],
        language
      });

      // Dividir história em páginas
      logger.info('Iniciando processamento das páginas do livro');
      const paragraphs = storyText.split('\n\n').filter(p => p.trim() !== '');
      const pagesCount = Math.max(Math.ceil(paragraphs.length / 2), 3); // Mínimo 3 páginas
      logger.info(`Total de páginas a serem geradas: ${pagesCount}`);

      // Primeiro, vamos gerar todas as páginas com texto
      logger.info('Fase 1: Gerando páginas com texto');
      for (let i = 0; i < pagesCount; i++) {
        const startIndex = i * 2;
        const endIndex = startIndex + 2;
        const pageText = paragraphs.slice(startIndex, endIndex).join('\n\n');

        book.pages.push({
          text: pageText,
          pageNumber: i + 1,
          imageUrl: '/default-book-image.png' // Imagem temporária
        });
      }

      // Agora, vamos gerar as imagens em paralelo
      logger.info('Fase 2: Iniciando geração de imagens');
      const imagePromises = book.pages.map(async (page, index) => {
        try {
          logger.info(`Preparando geração de imagem para página ${index + 1}`);
          const imagePrompt = `Ilustração para uma história infantil para ${ageRange} anos: ${page.text}`;
          const imageUrl = await OpenAIService.generateImage(imagePrompt);
          
          // Atualizar a URL da imagem na página
          book.pages[index].imageUrl = imageUrl;
          logger.info(`Imagem gerada com sucesso para página ${index + 1}`);
          
          // Salvar o livro após cada imagem gerada
          await book.save();
          logger.info(`Página ${index + 1} salva com nova imagem`);
        } catch (imageError) {
          logger.error(`Erro ao gerar imagem para página ${index + 1}: ${imageError.message}`);
          // Mantém a imagem padrão em caso de erro
        }
      });

      // Aguardar geração de todas as imagens
      logger.info('Aguardando conclusão da geração de todas as imagens');
      await Promise.all(imagePromises);
      logger.info('Todas as imagens foram geradas');

      // Salvar livro final
      const savedBook = await book.save();
      logger.info(`Livro salvo com ID: ${savedBook._id}`);

      if (!savedBook._id) {
        throw new Error('Erro ao salvar livro: ID não gerado');
      }

      // Buscar o livro recém-criado para garantir que todos os dados estão corretos
      const createdBook = await Book.findById(savedBook._id);

      if (!createdBook) {
        throw new Error('Erro ao recuperar livro após criação');
      }

      logger.info('Processo de criação do livro concluído com sucesso');

      // Garantir que todos os campos necessários estão presentes
      const responseBook = createdBook.toPlainObject();

      logger.info(`Retornando livro com ID: ${responseBook._id}`);

      return res.status(201).json({
        message: 'Livro criado com sucesso',
        book: {
          ...responseBook,
          wordCount
        }
      });
    } catch (error) {
      logger.error(`Erro ao criar livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao criar livro', 
        details: error.message 
      });
    }
  }

  public static async getBooks(req: Request, res: Response): Promise<Response> {
    try {
      const books = await Book.find({ userId: req.user?.id })
        .select('title genre theme mainCharacter createdAt');

      return res.status(200).json(books);
    } catch (error) {
      logger.error(`Erro ao buscar livros: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao buscar livros', 
        details: error.message 
      });
    }
  }

  public static async getBook(req: Request, res: Response): Promise<Response> {
    try {
      logger.info(`Buscando livro com ID: ${req.params.id}`);
      
      // Verificar se o ID é válido
      if (!req.params.id || req.params.id === 'undefined') {
        logger.error('ID do livro inválido');
        return res.status(400).json({ error: 'ID do livro inválido' });
      }

      const book = await Book.findOne({ 
        _id: req.params.id, 
        userId: req.user?.id 
      });

      if (!book) {
        logger.error(`Livro não encontrado: ${req.params.id}`);
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      // Usar o método toPlainObject para garantir conversão de IDs
      const bookData = book.toPlainObject();

      logger.info(`Livro encontrado: ${bookData.title}`);
      return res.status(200).json(bookData);
    } catch (error) {
      logger.error(`Erro ao buscar livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao buscar livro', 
        details: error.message 
      });
    }
  }

  public static async updateBook(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const book = await Book.findOneAndUpdate(
        { _id: id, userId: req.user?.id },
        updateData,
        { new: true }
      );

      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      logger.info(`Livro atualizado: ${book.title}`);

      return res.status(200).json(book);
    } catch (error) {
      logger.error(`Erro ao atualizar livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao atualizar livro', 
        details: error.message 
      });
    }
  }

  public static async getBookStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const book = await Book.findOne({ 
        _id: id, 
        userId: req.user?.id 
      });

      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      // Determinar o status e progresso
      let status = 'generating';
      let progress = 50; // Progresso padrão para geração em andamento

      if (book.pages && book.pages.length > 0) {
        status = 'completed';
        progress = 100;
      }

      return res.status(200).json({
        status,
        progress,
        book: {
          _id: book._id,
          title: book.title,
          pages: book.pages,
          wordCount: book.pages.reduce((total, page) => total + page.text.split(/\s+/).length, 0)
        }
      });
    } catch (error) {
      logger.error(`Erro ao buscar status do livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao buscar status do livro', 
        details: error.message 
      });
    }
  }
}

export default BookController;
