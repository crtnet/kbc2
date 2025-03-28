// src/controllers/bookFix.controller.ts
// Versão corrigida do controlador de livros para resolver problemas com avatares

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { Book } from '../models/Book';
import { avatarFixService } from '../services/avatarFixService';
import { config } from '../config/config';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: string;
    name?: string;
  };
}

class BookFixController {
  /**
   * POST /api/books
   * Versão corrigida do método de criação de livros com processamento assíncrono
   */
  public createBook = async (req: Request, res: Response) => {
    // Aumenta o timeout da requisição para 20 minutos
    req.setTimeout(1200000); // 20 minutos
    
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      logger.info('Iniciando criação de novo livro com processamento assíncrono');

      // Extrai parâmetros obrigatórios
      const {
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterAvatar,
        secondaryCharacter = '',
        secondaryCharacterAvatar = '',
        setting,
        tone,
        ageRange,
        authorName,
        language = 'pt-BR',
        characterDescription,
        environmentDescription
      } = req.body;

      // Validação de campos críticos
      if (!title || !genre || !theme || !mainCharacter || !setting || !tone) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'Campos obrigatórios ausentes'
        });
      }

      logger.info('Iniciando criação de novo livro', { title });

      // Processamento simplificado e robusto de avatares
      let normalizedMainAvatar;
      let normalizedSecondaryAvatar = '';

      try {
        // Processa avatar principal
        normalizedMainAvatar = avatarFixService.processAvatarUrl(mainCharacterAvatar, true);
        logger.info('Avatar principal processado com sucesso', { 
          original: mainCharacterAvatar,
          normalized: normalizedMainAvatar
        });

        // Processa avatar secundário, se existir
        if (secondaryCharacter) {
          normalizedSecondaryAvatar = avatarFixService.processAvatarUrl(secondaryCharacterAvatar, false);
          logger.info('Avatar secundário processado com sucesso', {
            original: secondaryCharacterAvatar,
            normalized: normalizedSecondaryAvatar
          });
        }
      } catch (avatarError) {
        logger.error('Erro no processamento de avatares, usando padrões', {
          error: avatarError instanceof Error ? avatarError.message : 'Erro desconhecido'
        });
        
        // Garante que mesmo em caso de erro, teremos avatares válidos
        normalizedMainAvatar = avatarFixService.getDefaultAvatarUrl(true);
        if (secondaryCharacter) {
          normalizedSecondaryAvatar = avatarFixService.getDefaultAvatarUrl(false);
        }
      }

      // Cria um livro inicial com status "processing"
      const userId = new mongoose.Types.ObjectId(authReq.user.id);
      const newBook = new Book({
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterAvatar: normalizedMainAvatar,
        secondaryCharacter,
        secondaryCharacterAvatar: normalizedSecondaryAvatar,
        setting,
        tone,
        ageRange,
        authorName,
        language,
        userId,
        prompt: req.body.prompt,
        pages: [], // Inicialmente sem páginas
        metadata: {
          wordCount: 0,
          pageCount: 0,
        },
        status: 'processing',
        styleGuide: {
          character: characterDescription || `${mainCharacter} é um personagem de livro infantil`,
          environment: environmentDescription || `${setting} é um ambiente colorido e acolhedor para crianças`,
          artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves"
        },
        characterDescription: characterDescription || `${mainCharacter} é um personagem de livro infantil`,
        environmentDescription: environmentDescription || `${setting} é um ambiente colorido e acolhedor para crianças`
      });

      // Salva o livro inicial no banco de dados
      await newBook.save();
      logger.info('Livro inicial salvo no banco de dados', { bookId: newBook._id });

      // Responde imediatamente com o ID do livro
      res.status(201).json({
        message: 'Livro criado com sucesso, gerando conteúdo em segundo plano...',
        bookId: newBook._id,
        status: 'processing'
      });

      // Processa o conteúdo do livro em segundo plano
      // Usamos setImmediate para garantir que a resposta seja enviada antes de iniciar o processamento
      setImmediate(() => {
        this.processBookContentAsync(newBook._id, req.body).catch(error => {
          logger.error('Erro no processamento assíncrono do livro', { 
            bookId: newBook._id, 
            error: error.message 
          });
        });
      });

    } catch (error: any) {
      logger.error('Erro ao criar livro', { error: error.message, stack: error.stack });
      return res.status(500).json({
        error: 'Erro no servidor ao criar o livro.',
        details: error.message
      });
    }
  };

  /**
   * Processa o conteúdo do livro de forma assíncrona
   */
  private processBookContentAsync = async (bookId: mongoose.Types.ObjectId, requestData: any) => {
    try {
      logger.info('Iniciando processamento assíncrono do livro', { bookId });

      // Recupera o livro do banco de dados
      const book = await Book.findById(bookId);
      if (!book) {
        throw new Error(`Livro não encontrado: ${bookId}`);
      }

      // Simulação de texto da história para o protótipo
      // Em uma implementação real, isto viria do serviço OpenAI
      const storyText = this.generateDemoStory(
        book.title, 
        book.mainCharacter, 
        book.secondaryCharacter || '', 
        book.setting
      );
      
      const wordCount = storyText.split(/\\s+/).length;
      const pages = this.splitStoryIntoPages(storyText);

      // Atualiza o livro com o conteúdo gerado
      book.pages = pages.map((text, index) => ({
        pageNumber: index + 1,
        text,
        imageUrl: `/assets/images/placeholder${index + 1}.jpg` // Imagens temporárias
      }));
      
      book.metadata = {
        wordCount,
        pageCount: pages.length,
      };
      
      book.status = 'completed';

      // Salva as atualizações
      await book.save();
      logger.info('Processamento assíncrono do livro concluído com sucesso', { bookId });

    } catch (error: any) {
      logger.error('Erro no processamento assíncrono do livro', { 
        bookId, 
        error: error.message,
        stack: error.stack
      });
      
      // Atualiza o status do livro para erro
      try {
        await Book.findByIdAndUpdate(bookId, { 
          status: 'error',
          errorMessage: error.message
        });
      } catch (updateError) {
        logger.error('Erro ao atualizar status de erro do livro', { 
          bookId, 
          error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
        });
      }
    }
  };

  /**
   * Gera uma história de demonstração para testes
   */
  private generateDemoStory(title: string, mainCharacter: string, secondaryCharacter: string, setting: string): string {
    const stories = [
      `# ${title}

Página 1:
Era uma vez, em um lugar chamado ${setting}, vivia ${mainCharacter}. Todos os dias, ${mainCharacter} acordava com um sorriso no rosto, pronto para uma nova aventura. O sol brilhava forte lá fora, fazendo com que tudo parecesse mágico e especial.

Página 2:
Um dia, enquanto explorava ${setting}, ${mainCharacter} encontrou algo surpreendente! Era ${secondaryCharacter ? secondaryCharacter : 'um novo amigo'} que parecia perdido e confuso. "${mainCharacter}! Que bom te encontrar!", disse ${secondaryCharacter ? secondaryCharacter : 'o novo amigo'} com um suspiro de alívio.

Página 3:
Juntos, eles decidiram explorar ${setting}. Durante a jornada, encontraram desafios divertidos e conheceram criaturas amigáveis que os ajudaram no caminho. A amizade entre ${mainCharacter} e ${secondaryCharacter ? secondaryCharacter : 'seu novo amigo'} crescia a cada passo.

Página 4:
De repente, uma pequena tempestade começou! Gotas de chuva caíam do céu, mas isso não os impediu. ${mainCharacter} teve uma ideia brilhante: construir um abrigo usando folhas e galhos. Com trabalho em equipe, conseguiram se proteger da chuva.

Página 5:
Quando a tempestade passou, um lindo arco-íris apareceu no céu de ${setting}. ${mainCharacter} e ${secondaryCharacter ? secondaryCharacter : 'seu amigo'} perceberam que juntos podiam superar qualquer desafio. Voltaram para casa felizes, sabendo que aquele era apenas o começo de muitas aventuras que teriam juntos em ${setting}.`,

      `# ${title}

Página 1:
No coração de ${setting}, vivia ${mainCharacter}. Todos diziam que ${mainCharacter} tinha um talento especial: conseguia ver a beleza em tudo ao seu redor. Cada manhã era uma nova oportunidade para descobrir maravilhas.

Página 2:
Certo dia, enquanto ${mainCharacter} observava as nuvens no céu, ouviu uma voz suave: "O que você está vendo?". Era ${secondaryCharacter ? secondaryCharacter : 'uma criatura mágica'}, que estava curioso sobre o que tanto encantava ${mainCharacter}.

Página 3:
"Estou vendo histórias nas nuvens", respondeu ${mainCharacter}. "Veja aquela! Parece um dragão dançando." ${secondaryCharacter ? secondaryCharacter : 'A criatura'} ficou impressionado e pediu para aprender a ver o mundo pelos olhos de ${mainCharacter}.

Página 4:
Durante dias, eles exploraram ${setting} juntos. ${mainCharacter} mostrava como as pequenas coisas podiam ser extraordinárias: o brilho de uma gota de orvalho, o movimento das folhas ao vento, o padrão das estrelas no céu noturno de ${setting}.

Página 5:
Ao final daquela semana mágica, ${secondaryCharacter ? secondaryCharacter : 'a criatura'} agradeceu a ${mainCharacter}: "Você me ensinou a ver com o coração, não apenas com os olhos." E assim, uma amizade especial nasceu em ${setting}, lembrando a todos que a verdadeira magia está na forma como escolhemos ver o mundo.`
    ];

    return stories[Math.floor(Math.random() * stories.length)];
  }

  /**
   * Divide a história em páginas
   */
  private splitStoryIntoPages(story: string): string[] {
    const pageMatches = story.match(/Página \d+:\n[^]*?(?=Página \d+:|$)/g);
    
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.map(page => {
        // Remove o cabeçalho "Página X:" e limpa o texto
        return page.replace(/Página \d+:\n/, '').trim();
      });
    }
    
    // Fallback: divide em parágrafos e depois em 5 páginas
    const paragraphs = story
      .replace(/# .*\n\n/, '') // Remove o título
      .split('\n\n')
      .filter(p => p.trim().length > 0);
      
    const pages: string[] = [];
    const paragraphsPerPage = Math.max(1, Math.ceil(paragraphs.length / 5));
    
    for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
      const pageContent = paragraphs.slice(i, i + paragraphsPerPage).join('\n\n');
      pages.push(pageContent);
    }
    
    // Garante que temos exatamente 5 páginas
    while (pages.length < 5) {
      pages.push(`Continua a aventura de ${story.includes('vivia') ? story.split('vivia ')[1]?.split('.')[0] || 'nosso herói' : 'nosso herói'}...`);
    }
    
    // Se temos mais de 5 páginas, condensa
    if (pages.length > 5) {
      return pages.slice(0, 5);
    }
    
    return pages;
  }
}

export const bookFixController = new BookFixController();