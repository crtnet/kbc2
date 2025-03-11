// src/controllers/avatarController.ts
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { avatarService } from '../services/avatarService';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: string;
    name?: string;
  };
}

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/assets/avatars/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && allowedTypes.test(ext)) {
      return cb(null, true);
    }
    
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'));
  }
}).single('avatar');

class AvatarController {
  /**
   * GET /avatars
   * Lista avatares disponíveis com base na categoria e estilo
   */
  public getAvatars = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const category = req.query.category as string || 'children';
      const style = req.query.style as string || 'cartoon';
      
      // Diretório base de avatares
      const baseDir = path.join(__dirname, '../../public/assets/avatars');
      
      // Diretório específico para a categoria e estilo
      const categoryDir = path.join(baseDir, category, style);
      
      // Verifica se o diretório existe
      if (!fs.existsSync(categoryDir)) {
        // Se não existir, tenta usar apenas a categoria
        const fallbackDir = path.join(baseDir, category);
        
        if (!fs.existsSync(fallbackDir)) {
          // Se nem a categoria existir, usa o diretório base
          return res.json({ avatars: this.getAvatarUrls(baseDir) });
        }
        
        return res.json({ avatars: this.getAvatarUrls(fallbackDir) });
      }
      
      // Retorna os avatares da categoria e estilo específicos
      const avatars = this.getAvatarUrls(categoryDir);
      
      return res.json({ avatars });
    } catch (error: any) {
      logger.error('Erro ao listar avatares', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao listar avatares',
        details: error.message,
      });
    }
  };

  /**
   * GET /avatars/categories
   * Lista categorias de avatares disponíveis
   */
  public getCategories = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Diretório base de avatares
      const baseDir = path.join(__dirname, '../../public/assets/avatars');
      
      // Lista os diretórios (categorias) dentro do diretório base
      const categories = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      return res.json({ categories });
    } catch (error: any) {
      logger.error('Erro ao listar categorias de avatares', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao listar categorias de avatares',
        details: error.message,
      });
    }
  };

  /**
   * GET /avatars/styles
   * Lista estilos de avatares disponíveis
   */
  public getStyles = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Diretório base de avatares
      const baseDir = path.join(__dirname, '../../public/assets/avatars');
      
      // Categoria especificada ou padrão
      const category = req.query.category as string || 'children';
      const categoryDir = path.join(baseDir, category);
      
      if (!fs.existsSync(categoryDir)) {
        return res.json({ styles: [] });
      }
      
      // Lista os diretórios (estilos) dentro da categoria
      const styles = fs.readdirSync(categoryDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      return res.json({ styles });
    } catch (error: any) {
      logger.error('Erro ao listar estilos de avatares', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao listar estilos de avatares',
        details: error.message,
      });
    }
  };

  /**
   * POST /avatars/upload
   * Faz upload de um avatar personalizado
   */
  public uploadAvatar = async (req: Request, res: Response) => {
    upload(req, res, async (err) => {
      try {
        const authReq = req as AuthRequest;
        if (!authReq.user) {
          return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if (err) {
          return res.status(400).json({
            error: 'Erro no upload do avatar',
            details: err.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            error: 'Nenhum arquivo enviado',
            details: 'É necessário enviar um arquivo de imagem'
          });
        }

        // Processa o avatar (redimensiona, otimiza, etc.)
        const processedPath = await avatarService.processAvatar(
          req.file.path,
          `upload_${path.basename(req.file.path, path.extname(req.file.path))}`
        );

        // Constrói a URL pública do avatar
        const relativePath = path.relative(
          path.join(__dirname, '../../public'),
          processedPath
        ).replace(/\\/g, '/');
        
        const avatarUrl = `${config.avatarServer}/${relativePath}`;

        return res.status(201).json({
          message: 'Avatar enviado com sucesso',
          avatarUrl
        });
      } catch (error: any) {
        logger.error('Erro ao fazer upload de avatar', { error: error.message });
        return res.status(500).json({
          error: 'Erro ao processar o avatar',
          details: error.message
        });
      }
    });
  };

  /**
   * POST /avatars/describe
   * Gera uma descrição detalhada do avatar para uso no DALL-E
   */
  public describeAvatar = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { name, avatarPath, type } = req.body;

      if (!name || !avatarPath || !type) {
        return res.status(400).json({
          error: 'Parâmetros inválidos',
          details: 'Nome, caminho do avatar e tipo são obrigatórios'
        });
      }

      // Usa o imageProcessor para gerar a descrição
      const description = await avatarService.describeAvatar({
        name,
        avatarPath,
        type
      });

      return res.json({ description });
    } catch (error: any) {
      logger.error('Erro ao gerar descrição do avatar', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao gerar descrição do avatar',
        details: error.message
      });
    }
  };

  /**
   * Obtém as URLs dos avatares em um diretório
   * @param dir Diretório dos avatares
   * @returns Array de URLs dos avatares
   */
  private getAvatarUrls(dir: string): string[] {
    try {
      // Lista os arquivos no diretório
      const files = fs.readdirSync(dir);
      
      // Filtra apenas arquivos de imagem
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });
      
      // Constrói as URLs públicas
      const relativePath = path.relative(
        path.join(__dirname, '../../public'),
        dir
      ).replace(/\\/g, '/');
      
      return imageFiles.map(file => `${config.avatarServer}/${relativePath}/${file}`);
    } catch (error) {
      logger.error('Erro ao obter URLs dos avatares', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        directory: dir
      });
      return [];
    }
  }
}

export default new AvatarController();