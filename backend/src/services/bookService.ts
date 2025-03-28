// src/services/bookService.ts
import axios from 'axios';
import { config } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Usar a URL da API do objeto de configuração
const API_URL = config.apiUrl;

/**
 * Interface para os dados de criação de um livro
 */
export interface CreateBookData {
  title: string;
  genre: 'adventure' | 'fantasy' | 'mystery';
  theme: 'friendship' | 'courage' | 'kindness';
  mainCharacter: string;
  mainCharacterAvatar: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: 'fun' | 'adventurous' | 'calm';
  ageRange: '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';
  authorName: string;
  language?: string;
  characterDescription?: string;
  environmentDescription?: string;
  styleGuide?: {
    character?: string;
    environment?: string;
    artisticStyle?: string;
  };
  coverStyle?: {
    backgroundColor?: string;
    titleColor?: string;
    authorColor?: string;
    titleFontSize?: number;
    authorFontSize?: number;
    theme?: 'light' | 'dark' | 'colorful';
  };
}

/**
 * Cria um novo livro
 * @param bookData Dados do livro a ser criado
 * @returns Resposta da API com o ID do livro criado
 */
export const createBook = async (bookData: CreateBookData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.post(`${API_URL}/books`, bookData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao criar livro:', error);
    throw error;
  }
};

/**
 * Busca todos os livros do usuário
 * @returns Lista de livros do usuário
 */
export const getBooks = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/books`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar livros:', error);
    throw error;
  }
};

/**
 * Busca um livro específico pelo ID
 * @param bookId ID do livro
 * @returns Dados do livro
 */
export const getBook = async (bookId: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar livro ${bookId}:`, error);
    throw error;
  }
};

/**
 * Exclui um livro
 * @param bookId ID do livro a ser excluído
 * @returns Resposta da API
 */
export const deleteBook = async (bookId: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.delete(`${API_URL}/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao excluir livro ${bookId}:`, error);
    throw error;
  }
};

/**
 * Obtém a URL do PDF de um livro
 * @param bookId ID do livro
 * @returns URL do PDF
 */
export const getBookPdfUrl = async (bookId: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    // Primeiro, verifica se o livro tem um PDF gerado
    const bookResponse = await axios.get(`${API_URL}/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (bookResponse.data?.data?.pdfUrl) {
      return `${API_URL}${bookResponse.data.data.pdfUrl}`;
    }
    
    throw new Error('PDF não disponível para este livro');
  } catch (error) {
    console.error(`Erro ao obter URL do PDF do livro ${bookId}:`, error);
    throw error;
  }
};

/**
 * Atualiza o estilo da capa de um livro
 * @param bookId ID do livro
 * @param coverStyle Estilo da capa
 * @returns Resposta da API
 */
export const updateBookCoverStyle = async (bookId: string, coverStyle: any) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.patch(`${API_URL}/books/${bookId}/cover-style`, { coverStyle }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao atualizar estilo da capa do livro ${bookId}:`, error);
    throw error;
  }
};

/**
 * Regenera uma imagem específica de um livro
 * @param bookId ID do livro
 * @param pageNumber Número da página
 * @returns Resposta da API com a nova URL da imagem
 */
export const regenerateBookImage = async (bookId: string, pageNumber: number) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.post(`${API_URL}/books/${bookId}/regenerate-image`, { pageNumber }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao regenerar imagem da página ${pageNumber} do livro ${bookId}:`, error);
    throw error;
  }
};