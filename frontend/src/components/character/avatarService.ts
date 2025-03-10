// src/services/avatarService.ts
import axios from 'axios';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default placeholder avatar URLs - using public URLs that are guaranteed to exist
const DEFAULT_AVATARS = {
  children: [
    'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
    'https://cdn-icons-png.flaticon.com/512/4140/4140051.png',
    'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
    'https://cdn-icons-png.flaticon.com/512/4140/4140047.png'
  ],
  adults: [
    'https://cdn-icons-png.flaticon.com/512/4140/4140061.png',
    'https://cdn-icons-png.flaticon.com/512/4140/4140066.png',
    'https://cdn-icons-png.flaticon.com/512/4140/4140060.png',
    'https://cdn-icons-png.flaticon.com/512/4140/4140076.png'
  ],
  animals: [
    'https://cdn-icons-png.flaticon.com/512/616/616412.png',
    'https://cdn-icons-png.flaticon.com/512/616/616408.png',
    'https://cdn-icons-png.flaticon.com/512/616/616430.png',
    'https://cdn-icons-png.flaticon.com/512/616/616554.png'
  ],
  fantasy: [
    'https://cdn-icons-png.flaticon.com/512/1691/1691243.png',
    'https://cdn-icons-png.flaticon.com/512/1691/1691291.png',
    'https://cdn-icons-png.flaticon.com/512/1691/1691287.png',
    'https://cdn-icons-png.flaticon.com/512/1691/1691284.png'
  ]
};

/**
 * Busca avatares disponíveis com base na categoria e estilo
 * @param category Categoria dos avatares (children, adults, animals, fantasy)
 * @param style Estilo visual (cartoon, realistic, anime)
 * @returns Lista de URLs dos avatares
 */
export const getAvatars = async (
  category: string = 'children',
  style: string = 'cartoon'
): Promise<string[]> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    // Try to get avatars from the server
    try {
      console.log(`Buscando avatares do servidor para categoria ${category} e estilo ${style}`);
      const response = await axios.get(`${API_URL}/avatars`, {
        params: { category, style },
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 10000 // 10 segundos de timeout
      });
      
      if (response.data && Array.isArray(response.data.avatars) && response.data.avatars.length > 0) {
        console.log(`Recebidos ${response.data.avatars.length} avatares do servidor`);
        return response.data.avatars;
      } else {
        console.log('Servidor retornou uma lista vazia de avatares');
      }
    } catch (serverError) {
      console.log('Erro ao buscar avatares do servidor, usando avatares padrão:', serverError);
    }
    
    // If we reach here, either the server request failed or returned no avatars
    // Return default avatars based on category
    console.log(`Usando avatares padrão para categoria ${category}`);
    const defaultCategory = category as keyof typeof DEFAULT_AVATARS;
    return DEFAULT_AVATARS[defaultCategory] || DEFAULT_AVATARS.children;
  } catch (error) {
    console.error('Erro ao buscar avatares:', error);
    // Return default avatars in case of any error
    const defaultCategory = category as keyof typeof DEFAULT_AVATARS;
    return DEFAULT_AVATARS[defaultCategory] || DEFAULT_AVATARS.children;
  }
};

/**
 * Busca categorias de avatares disponíveis
 * @returns Lista de categorias
 */
export const getAvatarCategories = async (): Promise<string[]> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/avatars/categories`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && Array.isArray(response.data.categories)) {
      return response.data.categories;
    }
    
    return ['children', 'adults', 'animals', 'fantasy'];
  } catch (error) {
    console.error('Erro ao buscar categorias de avatares:', error);
    // Retorna categorias padrão em caso de erro
    return ['children', 'adults', 'animals', 'fantasy'];
  }
};

/**
 * Busca estilos de avatares disponíveis
 * @returns Lista de estilos
 */
export const getAvatarStyles = async (): Promise<string[]> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/avatars/styles`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && Array.isArray(response.data.styles)) {
      return response.data.styles;
    }
    
    return ['cartoon', 'realistic', 'anime'];
  } catch (error) {
    console.error('Erro ao buscar estilos de avatares:', error);
    // Retorna estilos padrão em caso de erro
    return ['cartoon', 'realistic', 'anime'];
  }
};

/**
 * Faz upload de um avatar personalizado
 * @param imageUri URI da imagem local
 * @returns URL do avatar após upload
 */
export const uploadAvatar = async (imageUri: string): Promise<string> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    // Cria um objeto FormData para enviar a imagem
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // @ts-ignore - TypeScript não reconhece corretamente a estrutura do FormData para React Native
    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type
    });
    
    const response = await axios.post(`${API_URL}/avatars/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.avatarUrl) {
      return response.data.avatarUrl;
    }
    
    throw new Error('URL do avatar não retornada pelo servidor');
  } catch (error) {
    console.error('Erro ao fazer upload do avatar:', error);
    throw error;
  }
};