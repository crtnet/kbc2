import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '../utils/logger';

export const useImagePicker = () => {
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async (options?: ImagePicker.ImagePickerOptions) => {
    try {
      // Solicitar permissão para acessar a biblioteca de fotos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        logger.warn('Permissão para acessar biblioteca de fotos negada');
        return null;
      }

      // Abrir seletor de imagem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        ...options,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0].uri;
        setImage(selectedImage);
        logger.info('Imagem selecionada com sucesso', { uri: selectedImage });
        return selectedImage;
      }

      return null;
    } catch (error) {
      logger.error('Erro ao selecionar imagem', error);
      return null;
    }
  };

  const takePhoto = async (options?: ImagePicker.ImagePickerOptions) => {
    try {
      // Solicitar permissão para usar a câmera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        logger.warn('Permissão para usar a câmera negada');
        return null;
      }

      // Abrir câmera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        ...options,
      });

      if (!result.canceled) {
        const capturedImage = result.assets[0].uri;
        setImage(capturedImage);
        logger.info('Foto capturada com sucesso', { uri: capturedImage });
        return capturedImage;
      }

      return null;
    } catch (error) {
      logger.error('Erro ao capturar foto', error);
      return null;
    }
  };

  const clearImage = () => {
    setImage(null);
  };

  return {
    image,
    pickImage,
    takePhoto,
    clearImage,
  };
};