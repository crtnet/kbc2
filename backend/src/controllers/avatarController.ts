import { Request, Response } from 'express';
import { avatarService } from '../services/avatarService';
import { logger } from '../utils/logger';

export const avatarController = {
  /**
   * Upload de avatar
   * Recebe imagem em base64 e retorna o caminho do arquivo salvo
   */
  async uploadAvatar(req: Request, res: Response) {
    try {
      const { base64Image, characterId } = req.body;

      if (!base64Image || !characterId) {
        return res.status(400).json({
          error: 'base64Image e characterId são obrigatórios'
        });
      }

      const filePath = await avatarService.saveAvatar(base64Image, characterId);

      return res.json({
        success: true,
        filePath
      });
    } catch (error) {
      logger.error('Erro no upload de avatar:', error);
      return res.status(500).json({
        error: 'Erro ao processar upload do avatar'
      });
    }
  },

  /**
   * Recupera um avatar como base64
   */
  async getAvatar(req: Request, res: Response) {
    try {
      const { filePath } = req.params;

      if (!filePath) {
        return res.status(400).json({
          error: 'filePath é obrigatório'
        });
      }

      const base64Image = await avatarService.getAvatarAsBase64(filePath);

      return res.json({
        success: true,
        base64Image
      });
    } catch (error) {
      logger.error('Erro ao recuperar avatar:', error);
      return res.status(500).json({
        error: 'Erro ao recuperar avatar'
      });
    }
  }
};