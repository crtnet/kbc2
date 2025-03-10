// src/services/bookService.ts
import axios from 'axios';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeAvatarUrl, isValidCdnUrl } from '../utils/avatarUtils';

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
    
    // Criar uma cópia profunda dos dados para não modificar o objeto original
    const normalizedBookData = { ...bookData };
    
    try {
      // Normalizar a URL do avatar principal
      if (!normalizedBookData.mainCharacterAvatar) {
        console.warn('Avatar do personagem principal não fornecido, usando avatar padrão');
        normalizedBookData.mainCharacterAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
      }
      
      // Verificar e normalizar a URL do avatar principal usando nossa função utilitária
      if (normalizedBookData.mainCharacterAvatar) {
        const originalUrl = normalizedBookData.mainCharacterAvatar;
        normalizedBookData.mainCharacterAvatar = normalizeAvatarUrl(originalUrl);
        console.log(`Avatar principal normalizado: ${originalUrl} -> ${normalizedBookData.mainCharacterAvatar}`);
      }
      
      // Normalizar a URL do avatar secundário (se existir)
      if (normalizedBookData.secondaryCharacter && !normalizedBookData.secondaryCharacterAvatar) {
        console.warn('Avatar do personagem secundário não fornecido, usando avatar padrão');
        normalizedBookData.secondaryCharacterAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140051.png';
      }
      
      if (normalizedBookData.secondaryCharacterAvatar) {
        const originalUrl = normalizedBookData.secondaryCharacterAvatar;
        normalizedBookData.secondaryCharacterAvatar = normalizeAvatarUrl(originalUrl);
        console.log(`Avatar secundário normalizado: ${originalUrl} -> ${normalizedBookData.secondaryCharacterAvatar}`);
      }
    } catch (normalizationError) {
      console.error('Erro durante a normalização de URLs de avatar:', normalizationError);
      // Em caso de erro na normalização, usar avatares padrão seguros
      normalizedBookData.mainCharacterAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
      if (normalizedBookData.secondaryCharacter) {
        normalizedBookData.secondaryCharacterAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140051.png';
      }
    }
    
    // Verificação final para garantir que as URLs são válidas
    if (!isValidCdnUrl(normalizedBookData.mainCharacterAvatar)) {
      console.warn('A URL do avatar principal não é de um CDN confiável, usando avatar padrão');
      normalizedBookData.mainCharacterAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
    }
    
    if (normalizedBookData.secondaryCharacterAvatar && !isValidCdnUrl(normalizedBookData.secondaryCharacterAvatar)) {
      console.warn('A URL do avatar secundário não é de um CDN confiável, usando avatar padrão');
      normalizedBookData.secondaryCharacterAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140051.png';
    }
    
    // Log dos dados após normalização para depuração
    console.log('Enviando requisição para criar livro com dados normalizados:', {
      title: normalizedBookData.title,
      mainCharacter: normalizedBookData.mainCharacter,
      mainCharacterAvatar: normalizedBookData.mainCharacterAvatar,
      secondaryCharacter: normalizedBookData.secondaryCharacter,
      secondaryCharacterAvatar: normalizedBookData.secondaryCharacterAvatar
    });
    
    const response = await axios.post(`${API_URL}/books`, normalizedBookData, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeout: 30000 // 30 segundos de timeout
    });
    
    console.log('Resposta da criação do livro:', response.data);
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