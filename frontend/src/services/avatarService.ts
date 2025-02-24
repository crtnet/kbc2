import api from './api';

/**
 * Converte um arquivo de imagem para base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Serviço para gerenciar avatares
 */
export const avatarService = {
  /**
   * Faz upload de um avatar para o backend
   */
  async uploadAvatar(file: File, characterId: string): Promise<string> {
    try {
      // Converter arquivo para base64
      const base64Image = await fileToBase64(file);

      // Enviar para o backend
      const response = await api.post('/avatars/upload', {
        base64Image,
        characterId
      });

      return response.data.filePath;
    } catch (error) {
      console.error('Erro ao fazer upload do avatar:', error);
      throw new Error('Falha ao fazer upload do avatar');
    }
  },

  /**
   * Recupera um avatar do backend
   */
  async getAvatar(filePath: string): Promise<string> {
    try {
      const response = await api.get(`/avatars/${filePath}`);
      return response.data.base64Image;
    } catch (error) {
      console.error('Erro ao recuperar avatar:', error);
      throw new Error('Falha ao recuperar avatar');
    }
  }
};