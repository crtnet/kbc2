// src/controllers/avatarCustomizationController.ts
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import mongoose from 'mongoose';
import { CustomAvatar } from '../models/CustomAvatar';
import sharp from 'sharp';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: string;
    name?: string;
  };
}

class AvatarCustomizationController {
  /**
   * POST /avatars/custom
   * Gera um avatar personalizado com base nas partes selecionadas
   */
  public generateCustomAvatar = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { parts, colors, adjustments } = req.body;

      if (!parts || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'É necessário fornecer pelo menos uma parte do avatar'
        });
      }

      // Diretório para salvar o avatar gerado
      const outputDir = path.join(__dirname, '../../public/assets/avatars/custom');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Gera um ID único para o avatar
      const avatarId = uuidv4();
      const outputPath = path.join(outputDir, `${avatarId}.png`);

      // Gera o avatar combinando as partes
      await this.combineAvatarParts(parts, colors, adjustments, outputPath);

      // Constrói a URL pública do avatar
      const relativePath = path.relative(
        path.join(__dirname, '../../public'),
        outputPath
      ).replace(/\\/g, '/');
      
      const avatarUrl = `${config.avatarServer}/${relativePath}`;

      return res.status(201).json({
        message: 'Avatar personalizado gerado com sucesso',
        avatarUrl,
        avatarId
      });
    } catch (error: any) {
      logger.error('Erro ao gerar avatar personalizado', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao gerar avatar personalizado',
        details: error.message
      });
    }
  };

  /**
   * POST /avatars/save
   * Salva um avatar personalizado na conta do usuário
   */
  public saveCustomAvatar = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { avatarData, name } = req.body;

      if (!avatarData || !name) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'É necessário fornecer os dados do avatar e um nome'
        });
      }

      const userId = new mongoose.Types.ObjectId(authReq.user.id);

      // Verifica se já existe um avatar com esse nome para o usuário
      const existingAvatar = await CustomAvatar.findOne({ userId, name });
      if (existingAvatar) {
        return res.status(400).json({
          error: 'Nome já utilizado',
          details: 'Já existe um avatar com esse nome'
        });
      }

      // Gera o avatar e obtém a URL
      const { avatarUrl, avatarId } = await this.generateAndSaveAvatar(avatarData);

      // Salva os dados no banco de dados
      const newAvatar = new CustomAvatar({
        userId,
        name,
        avatarUrl,
        avatarData,
        createdAt: new Date()
      });

      await newAvatar.save();

      return res.status(201).json({
        message: 'Avatar personalizado salvo com sucesso',
        avatarId: newAvatar._id,
        avatarUrl
      });
    } catch (error: any) {
      logger.error('Erro ao salvar avatar personalizado', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao salvar avatar personalizado',
        details: error.message
      });
    }
  };

  /**
   * GET /avatars/saved
   * Obtém a lista de avatares personalizados salvos pelo usuário
   */
  public getSavedAvatars = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = new mongoose.Types.ObjectId(authReq.user.id);

      // Busca os avatares do usuário
      const avatars = await CustomAvatar.find({ userId })
        .sort({ createdAt: -1 })
        .select('_id name avatarUrl createdAt')
        .exec();

      return res.json({ avatars });
    } catch (error: any) {
      logger.error('Erro ao obter avatares personalizados', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao obter avatares personalizados',
        details: error.message
      });
    }
  };

  /**
   * GET /avatars/:avatarId/edit
   * Obtém os dados de um avatar personalizado para edição
   */
  public getAvatarForEditing = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { avatarId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(avatarId)) {
        return res.status(400).json({ error: 'ID de avatar inválido' });
      }

      const userId = new mongoose.Types.ObjectId(authReq.user.id);

      // Busca o avatar do usuário
      const avatar = await CustomAvatar.findOne({
        _id: avatarId,
        userId
      }).exec();

      if (!avatar) {
        return res.status(404).json({
          error: 'Avatar não encontrado',
          details: 'O avatar não existe ou não pertence ao usuário'
        });
      }

      return res.json({
        avatarData: avatar.avatarData,
        name: avatar.name,
        avatarUrl: avatar.avatarUrl
      });
    } catch (error: any) {
      logger.error('Erro ao obter avatar para edição', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao obter avatar para edição',
        details: error.message
      });
    }
  };

  /**
   * PUT /avatars/:avatarId
   * Atualiza um avatar personalizado existente
   */
  public updateAvatar = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { avatarId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(avatarId)) {
        return res.status(400).json({ error: 'ID de avatar inválido' });
      }

      const { avatarData, name } = req.body;

      if (!avatarData) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'É necessário fornecer os dados do avatar'
        });
      }

      const userId = new mongoose.Types.ObjectId(authReq.user.id);

      // Busca o avatar do usuário
      const avatar = await CustomAvatar.findOne({
        _id: avatarId,
        userId
      }).exec();

      if (!avatar) {
        return res.status(404).json({
          error: 'Avatar não encontrado',
          details: 'O avatar não existe ou não pertence ao usuário'
        });
      }

      // Se o nome foi alterado, verifica se já existe outro avatar com esse nome
      if (name && name !== avatar.name) {
        const existingAvatar = await CustomAvatar.findOne({
          userId,
          name,
          _id: { $ne: avatarId }
        });

        if (existingAvatar) {
          return res.status(400).json({
            error: 'Nome já utilizado',
            details: 'Já existe outro avatar com esse nome'
          });
        }

        avatar.name = name;
      }

      // Gera o avatar atualizado e obtém a URL
      const { avatarUrl } = await this.generateAndSaveAvatar(avatarData);

      // Atualiza os dados no banco de dados
      avatar.avatarUrl = avatarUrl;
      avatar.avatarData = avatarData;
      avatar.updatedAt = new Date();

      await avatar.save();

      return res.json({
        message: 'Avatar personalizado atualizado com sucesso',
        avatarUrl
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar avatar personalizado', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao atualizar avatar personalizado',
        details: error.message
      });
    }
  };

  /**
   * DELETE /avatars/:avatarId
   * Exclui um avatar personalizado
   */
  public deleteAvatar = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { avatarId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(avatarId)) {
        return res.status(400).json({ error: 'ID de avatar inválido' });
      }

      const userId = new mongoose.Types.ObjectId(authReq.user.id);

      // Busca o avatar do usuário
      const avatar = await CustomAvatar.findOne({
        _id: avatarId,
        userId
      }).exec();

      if (!avatar) {
        return res.status(404).json({
          error: 'Avatar não encontrado',
          details: 'O avatar não existe ou não pertence ao usuário'
        });
      }

      // Tenta excluir o arquivo de imagem
      try {
        const avatarPath = new URL(avatar.avatarUrl).pathname;
        const filePath = path.join(__dirname, '../../public', avatarPath);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        logger.error('Erro ao excluir arquivo de imagem do avatar', {
          error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
          avatarId
        });
        // Continua mesmo se não conseguir excluir o arquivo
      }

      // Exclui o registro do banco de dados
      await CustomAvatar.deleteOne({ _id: avatarId, userId });

      return res.json({
        message: 'Avatar personalizado excluído com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao excluir avatar personalizado', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao excluir avatar personalizado',
        details: error.message
      });
    }
  };

  /**
   * Gera e salva um avatar personalizado
   * @param avatarData Dados do avatar
   * @returns URL e ID do avatar gerado
   */
  private async generateAndSaveAvatar(avatarData: any): Promise<{ avatarUrl: string, avatarId: string }> {
    // Diretório para salvar o avatar gerado
    const outputDir = path.join(__dirname, '../../public/assets/avatars/custom');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Gera um ID único para o avatar
    const avatarId = uuidv4();
    const outputPath = path.join(outputDir, `${avatarId}.png`);

    // Extrai as partes, cores e ajustes do avatarData
    const { parts, colors, adjustments } = avatarData;

    // Gera o avatar combinando as partes
    await this.combineAvatarParts(parts, colors, adjustments, outputPath);

    // Constrói a URL pública do avatar
    const relativePath = path.relative(
      path.join(__dirname, '../../public'),
      outputPath
    ).replace(/\\/g, '/');
    
    const avatarUrl = `${config.avatarServer}/${relativePath}`;

    return { avatarUrl, avatarId };
  }

  /**
   * Combina as partes do avatar em uma única imagem
   * @param parts Partes do avatar
   * @param colors Cores das partes
   * @param adjustments Ajustes de tamanho, posição, etc.
   * @param outputPath Caminho de saída da imagem
   */
  private async combineAvatarParts(
    parts: any[],
    colors: Record<string, string>,
    adjustments: Record<string, any>,
    outputPath: string
  ): Promise<void> {
    try {
      // Tamanho base do avatar
      const width = 512;
      const height = 512;

      // Cria uma imagem base transparente
      let baseImage = sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });

      // Ordena as partes por camada (z-index)
      const sortedParts = [...parts].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      // Composição de imagens
      const compositeOperations = [];

      // Processa cada parte do avatar
      for (const part of sortedParts) {
        if (!part.option) continue;

        // Caminho da imagem da parte
        const partPath = path.join(__dirname, '../../public', new URL(part.option).pathname);
        
        if (!fs.existsSync(partPath)) {
          logger.warn(`Arquivo de parte do avatar não encontrado: ${partPath}`);
          continue;
        }

        // Carrega a imagem da parte
        let partImage = sharp(partPath);

        // Aplica cor, se especificada
        if (colors && colors[part.partId] && part.colorizable) {
          // Converte a cor hex para RGB
          const color = colors[part.partId].replace('#', '');
          const r = parseInt(color.substring(0, 2), 16);
          const g = parseInt(color.substring(2, 4), 16);
          const b = parseInt(color.substring(4, 6), 16);

          // Aplica a cor como uma camada de mistura
          partImage = partImage.composite([{
            input: Buffer.from([r, g, b, 128]),
            raw: {
              width: 1,
              height: 1,
              channels: 4
            },
            blend: 'multiply'
          }]);
        }

        // Aplica ajustes, se especificados
        const partAdjustments = adjustments && adjustments[part.partId];
        if (partAdjustments) {
          // Redimensiona com base nos ajustes de tamanho
          const scale = partAdjustments.scale || 1;
          const scaleX = partAdjustments.scaleX || scale;
          const scaleY = partAdjustments.scaleY || scale;

          if (scaleX !== 1 || scaleY !== 1) {
            const metadata = await partImage.metadata();
            const newWidth = Math.round((metadata.width || width) * scaleX);
            const newHeight = Math.round((metadata.height || height) * scaleY);
            
            partImage = partImage.resize(newWidth, newHeight);
          }

          // Aplica rotação, se especificada
          if (partAdjustments.rotation) {
            partImage = partImage.rotate(partAdjustments.rotation);
          }
        }

        // Converte a imagem processada para buffer
        const partBuffer = await partImage.toBuffer();

        // Calcula a posição com base nos ajustes
        let left = 0;
        let top = 0;

        if (partAdjustments && partAdjustments.position) {
          left = Math.round(partAdjustments.position.x * width);
          top = Math.round(partAdjustments.position.y * height);
        }

        // Adiciona à lista de operações de composição
        compositeOperations.push({
          input: partBuffer,
          left,
          top
        });
      }

      // Aplica todas as operações de composição
      baseImage = baseImage.composite(compositeOperations);

      // Salva a imagem final
      await baseImage.png().toFile(outputPath);
    } catch (error) {
      logger.error('Erro ao combinar partes do avatar', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }
}

export default new AvatarCustomizationController();