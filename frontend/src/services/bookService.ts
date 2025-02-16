import { api } from './api';
import { Book } from '../types/book';
import { logger } from '../utils/logger';
import { API_ENDPOINTS } from '../config/constants';

export const createBook = async (bookData: Partial<Book>) => {
  try {
    // Formata os dados conforme esperado pelo backend
    const formattedData = {
      title: bookData.title,
      genre: bookData.genre,
      theme: bookData.theme,
      mainCharacter: bookData.mainCharacter,
      setting: bookData.setting,
      tone: bookData.tone || 'fun',
      ageRange: bookData.ageRange || '5-6',
      authorName: bookData.authorName || 'Anonymous',
      userId: bookData.userId,
      language: bookData.language || 'pt-BR',
      prompt: bookData.prompt || `Create a children's story about ${bookData.mainCharacter} in ${bookData.setting}. Theme: ${bookData.theme}, Genre: ${bookData.genre}`
    };

    logger.info('Enviando dados para criação de livro', { 
      ...formattedData,
      prompt: formattedData.prompt.substring(0, 50) + '...' // Log parcial do prompt
    });

    const response = await api.post(API_ENDPOINTS.BOOKS.BASE, formattedData);
    
    logger.info('Resposta da API de criação de livro', {
      status: response.status,
      data: response.data
    });

    if (!response.data?.data?.bookId) {
      throw new Error('ID do livro não retornado pelo servidor');
    }
    
    logger.info('Livro criado com sucesso', { 
      bookId: response.data.data.bookId,
      status: response.data.data.status 
    });
    
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao criar livro', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      requestData: bookData
    });
    
    if (error.response?.status === 401) {
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data.details || 'Dados inválidos para criação do livro');
    } else if (error.response?.status === 500) {
      throw new Error('Erro no servidor ao criar o livro. Tente novamente mais tarde.');
    } else if (!error.response) {
      throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
    }
    
    throw error;
  }
};

export const getBooks = async (): Promise<Book[]> => {
  try {
    const response = await api.get(API_ENDPOINTS.BOOKS.BASE);
    logger.info('Livros obtidos com sucesso', { count: response.data.length });
    return response.data;
  } catch (error) {
    logger.error('Erro ao obter livros', error);
    throw error;
  }
};

export const getBookById = async (bookId: string): Promise<Book> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.BOOKS.BASE}/${bookId}`);
    logger.info('Livro obtido com sucesso', { bookId });
    return response.data;
  } catch (error) {
    logger.error(`Erro ao obter livro ${bookId}`, error);
    throw error;
  }
};

export const updateBook = async (bookId: string, bookData: Partial<Book>) => {
  try {
    const response = await api.patch(`${API_ENDPOINTS.BOOKS.BASE}/${bookId}`, bookData);
    logger.info('Livro atualizado com sucesso', { bookId });
    return response.data;
  } catch (error) {
    logger.error(`Erro ao atualizar livro ${bookId}`, error);
    throw error;
  }
};

export const deleteBook = async (bookId: string) => {
  try {
    await api.delete(`${API_ENDPOINTS.BOOKS.BASE}/${bookId}`);
    logger.info('Livro excluído com sucesso', { bookId });
  } catch (error) {
    logger.error(`Erro ao excluir livro ${bookId}`, error);
    throw error;
  }
};

export const getBookPdfUrl = async (bookId: string): Promise<string> => {
  try {
    logger.info('Obtendo URL do PDF', { bookId });
    
    const response = await api.get(API_ENDPOINTS.BOOKS.PDF_URL(bookId));
    
    if (!response.data?.url) {
      throw new Error('URL do PDF não encontrada na resposta');
    }

    logger.info('URL do PDF obtida com sucesso', { 
      bookId,
      url: response.data.url 
    });
    
    return response.data.url;
  } catch (error) {
    logger.error('Erro ao obter URL do PDF', { 
      bookId, 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText 
    });
    throw error;
  }
};