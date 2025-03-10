// src/services/avatarCustomizationService.ts
import axios from 'axios';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Envia os dados do avatar personalizado para o servidor para gerar a imagem final
 * @param avatarData Dados do avatar personalizado
 * @returns URL da imagem do avatar gerado
 */
export const generateCustomAvatar = async (avatarData: any): Promise<string> => {
  try {
    // Implementação temporária - retornar diretamente a URL da face como avatar
    // enquanto o endpoint da API não estiver funcionando
    console.log('Usando implementação temporária para avatar personalizado');
    
    // Tenta encontrar a URL da face para usar como fallback
    let facePart = avatarData.parts.find((part: any) => part.partId === 'face');
    let faceImageUrl = facePart?.option || '';
    
    console.log('Face part encontrada:', facePart);
    console.log('URL da imagem face:', faceImageUrl);
    
    // Se não encontrou a face, tenta buscar outra parte
    if (!faceImageUrl) {
      // Tenta encontrar qualquer parte com uma URL de imagem
      const anyPartWithImage = avatarData.parts.find((part: any) => part.option);
      faceImageUrl = anyPartWithImage?.option || '';
      console.log('Face não encontrada, usando outra parte:', faceImageUrl);
    }
    
    // Se ainda não tem URL, use um avatar padrão
    if (!faceImageUrl) {
      faceImageUrl = 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';
      console.log('Nenhuma parte com URL encontrada, usando padrão');
    }
    
    // Garantir que a URL seja válida e aponte para uma imagem real
    if (!faceImageUrl.startsWith('http')) {
      console.log('URL inválida, usando avatar padrão');
      faceImageUrl = 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';
    }
    
    console.log('Usando imagem como avatar:', faceImageUrl);
    return faceImageUrl;
  } catch (error) {
    console.error('Erro ao gerar avatar personalizado:', error);
    
    // Em último caso, retorne um avatar padrão
    return 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';
  }
};

/**
 * Salva um avatar personalizado na conta do usuário
 * @param avatarData Dados do avatar personalizado
 * @param name Nome do avatar
 * @returns ID do avatar salvo
 */
export const saveCustomAvatar = async (avatarData: any, name: string): Promise<string> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.post(`${API_URL}/avatars/save`, {
      avatarData,
      name
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.avatarId) {
      return response.data.avatarId;
    }
    
    throw new Error('ID do avatar não retornado pelo servidor');
  } catch (error) {
    console.error('Erro ao salvar avatar personalizado:', error);
    throw error;
  }
};

/**
 * Obtém a lista de avatares personalizados salvos pelo usuário
 * @returns Lista de avatares personalizados
 */
export const getSavedCustomAvatars = async (): Promise<any[]> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/avatars/saved`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && Array.isArray(response.data.avatars)) {
      return response.data.avatars;
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao obter avatares personalizados salvos:', error);
    return [];
  }
};

/**
 * Exclui um avatar personalizado salvo
 * @param avatarId ID do avatar a ser excluído
 * @returns true se a exclusão foi bem-sucedida
 */
export const deleteCustomAvatar = async (avatarId: string): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    await axios.delete(`${API_URL}/avatars/${avatarId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir avatar personalizado:', error);
    return false;
  }
};

/**
 * Obtém as configurações de um avatar personalizado para edição
 * @param avatarId ID do avatar a ser editado
 * @returns Dados do avatar para edição
 */
export const getCustomAvatarForEditing = async (avatarId: string): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/avatars/${avatarId}/edit`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.avatarData) {
      return response.data.avatarData;
    }
    
    throw new Error('Dados do avatar não retornados pelo servidor');
  } catch (error) {
    console.error('Erro ao obter avatar para edição:', error);
    throw error;
  }
};

/**
 * Atualiza um avatar personalizado existente
 * @param avatarId ID do avatar a ser atualizado
 * @param avatarData Novos dados do avatar
 * @returns URL da imagem do avatar atualizado
 */
export const updateCustomAvatar = async (avatarId: string, avatarData: any): Promise<string> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.put(`${API_URL}/avatars/${avatarId}`, avatarData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.avatarUrl) {
      return response.data.avatarUrl;
    }
    
    throw new Error('URL do avatar não retornada pelo servidor');
  } catch (error) {
    console.error('Erro ao atualizar avatar personalizado:', error);
    
    // Em caso de erro, retornar uma URL de fallback
    return avatarData.parts.find((part: any) => part.partId === 'face')?.option || 
           'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';
  }
};