import { Request, Response } from 'express';
import path from 'path';
import Book, { IBook } from '../models/Book'; // Certifique-se de que o arquivo se chama "Book.ts"
import OpenAIService from '../services/openai';
import StoryGeneratorService from '../services/storyGenerator';
import { generateBookPDF, defaultOptions } from '../services/pdfGenerator';
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

      // Validação dos dados de entrada
      const validationErrors: string[] = [];
      if (!title) validationErrors.push('Título é obrigatório');
      if (!genre) validationErrors.push('Gênero é obrigatório');
      if (!theme) validationErrors.push('Tema é obrigatório');
      if (!mainCharacter) validationErrors.push('Personagem principal é obrigatório');
      if (!setting) validationErrors.push('Cenário é obrigatório');
      if (!tone) validationErrors.push('Tom é obrigatório');
      if (!ageRange) validationErrors.push('Faixa etária é obrigatória');

      const validAgeRanges: string[] = ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'];
      if (ageRange && !validAgeRanges.includes(ageRange)) {
        validationErrors.push(`Faixa etária inválida. Valores válidos: ${validAgeRanges.join(', ')}`);
      }
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: 'Dados inválidos', details: validationErrors });
      }

      // Geração da história
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

      // Criação do objeto livro
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

      logger.info('Iniciando processamento das páginas do livro');
      const paragraphs = storyText.split('\n\n').filter(p => p.trim() !== '');
      const pagesCount = Math.max(Math.ceil(paragraphs.length / 2), 3); // Mínimo 3 páginas
      logger.info(`Total de páginas a serem geradas: ${pagesCount}`);

      // Fase 1: Gerar páginas com texto
      logger.info('Fase 1: Gerando páginas com texto');
      for (let i = 0; i < pagesCount; i++) {
        const startIndex = i * 2;
        const endIndex = startIndex + 2;
        const pageText = paragraphs.slice(startIndex, endIndex).join('\n\n');
        book.pages.push({
          text: pageText,
          pageNumber: i + 1,
          imageUrl: '/default-book-image.png' // imagem temporária
        });
      }

      // Fase 2: Gerar imagens em paralelo para cada página
      // Utiliza um cache para garantir consistência nos prompts repetidos
      logger.info('Fase 2: Iniciando geração de imagens');
      const imageCache = new Map<string, string>();
      const imagePromises = book.pages.map(async (page, index) => {
        try {
          logger.info(`Preparando geração de imagem para página ${index + 1}`);
          // Cria uma chave de prompt combinando o personagem principal e um trecho do texto da página
          const promptKey = `Personagem: ${mainCharacter} | Trecho: ${page.text.substring(0, 100)}`;
          const imagePrompt = `Crie uma ilustração de fundo para um livro infantil em formato A3, sem incluir texto. A imagem deve ter um visual suave, com cores pastel e design minimalista, adequada para servir como fundo para uma página de história. Ela deve refletir o seguinte conteúdo e apresentar consistentemente o personagem principal "${mainCharacter}": "${promptKey}".`;
          
          if (imageCache.has(imagePrompt)) {
            const cachedImageUrl = imageCache.get(imagePrompt);
            book.pages[index].imageUrl = cachedImageUrl;
            logger.info(`Imagem reutilizada para página ${index + 1}`);
          } else {
            const imageUrl = await OpenAIService.generateImage(imagePrompt);
            imageCache.set(imagePrompt, imageUrl);
            book.pages[index].imageUrl = imageUrl;
            logger.info(`Imagem gerada com sucesso para página ${index + 1}`);
            await book.save();
            logger.info(`Página ${index + 1} salva com nova imagem`);
          }
        } catch (imageError) {
          logger.error(`Erro ao gerar imagem para página ${index + 1}: ${imageError.message}`);
          // Mantém a imagem padrão em caso de erro
        }
      });

      logger.info('Aguardando conclusão da geração de todas as imagens');
      await Promise.all(imagePromises);
      logger.info('Todas as imagens foram geradas');

      // Atualiza o status para "completed" e salva o livro final
      book.status = 'completed';
      const savedBook = await book.save();
      logger.info(`Livro salvo com ID: ${savedBook._id}`);

      // Geração do PDF do livro com formatação de livro infantil (formato A3)
      const pdfUrl = await generateBookPDF(savedBook, { ...defaultOptions, format: 'A3' });
      
      // Log adicional para verificar o PDF
      logger.info('Tentando salvar URL do PDF', { 
        bookId: savedBook._id, 
        pdfUrl: pdfUrl 
      });

      savedBook.pdfUrl = pdfUrl;
      await savedBook.save();
      logger.info(`PDF gerado com URL: ${pdfUrl}`);

      // Verificação extra
      const updatedBook = await Book.findById(savedBook._id);
      if (!updatedBook || !updatedBook.pdfUrl) {
        logger.error('Falha ao salvar URL do PDF no banco de dados', { 
          bookId: savedBook._id 
        });
      } else {
        logger.info('URL do PDF salva com sucesso', { 
          bookId: updatedBook._id, 
          pdfUrl: updatedBook.pdfUrl 
        });
      }
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
      if (!req.params.id || req.params.id === 'undefined') {
        logger.error('ID do livro inválido');
        return res.status(400).json({ error: 'ID do livro inválido' });
      }
      const book = await Book.findOne({ _id: req.params.id, userId: req.user?.id });
      if (!book) {
        logger.error(`Livro não encontrado: ${req.params.id}`);
        return res.status(404).json({ error: 'Livro não encontrado' });
      }
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
      const book = await Book.findOne({ _id: id, userId: req.user?.id });
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }
      let status = 'generating';
      let progress = 50;
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

  // Retorna a URL para visualizar o PDF com efeito flip
  public static async getBookPDFViewer(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const book = await Book.findOne({ _id: id, userId: req.user?.id });
      if (!book || !book.pdfUrl) {
        return res.status(404).json({ error: 'PDF não encontrado' });
      }
      // Considerando que process.env.BASE_URL seja a URL base do seu servidor (ex: https://seu-servidor.com)
      const viewerUrl = `${process.env.BASE_URL}/flipviewer.html?pdf=${encodeURIComponent(book.pdfUrl)}`;
      return res.status(200).json({ viewerUrl });
    } catch (error) {
      logger.error(`Erro ao buscar visualizador de PDF: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao buscar visualizador de PDF', 
        details: error.message 
      });
    }
  }

  // Serve o arquivo PDF
  public static async getBookPDF(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      logger.info(`Buscando PDF do livro ${id}`, { 
        userId: req.user?.id 
      });
      
      // Busca o livro com log detalhado
      const book = await Book.findOne({ 
        _id: id, 
        userId: req.user?.id 
      });
      
      // Log detalhado da busca do livro
      if (!book) {
        logger.error('Livro não encontrado', { 
          bookId: id, 
          userId: req.user?.id 
        });
        res.status(404).json({ 
          error: 'Livro não encontrado', 
          details: 'Verifique o ID do livro e suas permissões' 
        });
        return;
      }

      // Log do estado do PDF
      if (!book.pdfUrl) {
        logger.error('PDF não gerado para este livro', { 
          bookId: id, 
          userId: req.user?.id 
        });
        res.status(404).json({ 
          error: 'PDF não encontrado', 
          details: 'O PDF para este livro ainda não foi gerado' 
        });
        return;
      }

      // Remove a barra inicial e 'pdfs' do caminho do PDF se existir
      const pdfPath = path.join(
        __dirname, 
        '../../public/pdfs', 
        path.basename(book.pdfUrl)
      );
      
      logger.info('Caminho do PDF', { 
        bookId: id, 
        pdfPath: pdfPath 
      });
      
      // Verifica a existência do arquivo
      if (!fs.existsSync(pdfPath)) {
        logger.error('Arquivo PDF não encontrado no sistema de arquivos', { 
          bookId: id, 
          pdfPath: pdfPath 
        });
        res.status(404).json({ 
          error: 'Arquivo PDF não encontrado', 
          details: 'O arquivo PDF não existe no servidor' 
        });
        return;
      }

      // Configurar headers para download do PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${book.title}.pdf"`);
      
      // Criar stream de leitura e pipe para a resposta
      const stream = fs.createReadStream(pdfPath);
      stream.on('error', (error) => {
        logger.error('Erro ao ler arquivo PDF', { 
          bookId: id, 
          error: error.message 
        });
        res.status(500).json({ 
          error: 'Erro ao ler arquivo PDF', 
          details: error.message 
        });
      });
      
      stream.pipe(res);
    } catch (error) {
      logger.error('Erro ao servir PDF', { 
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ 
        error: 'Erro ao servir PDF', 
        details: error.message 
      });
    }
  }
}

export default BookController;
