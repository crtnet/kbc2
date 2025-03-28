import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class StorageService {
  private uploadDir: string;
  private imagesDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public', 'pdfs');
    this.imagesDir = path.join(process.cwd(), 'public', 'images');
    
    // Cria os diretórios se não existirem
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
  }

  public async uploadPDFToStorage(pdfBuffer: Buffer, bookId: string): Promise<string> {
    try {
      const fileName = `${bookId}.pdf`;
      const destinationPath = path.join(this.uploadDir, fileName);

      logger.info(`Iniciando upload do PDF para o livro ${bookId}`, {
        destinationPath,
        bufferSize: pdfBuffer.length
      });

      // Salva o arquivo PDF de forma assíncrona
      await fs.promises.writeFile(destinationPath, pdfBuffer);

      logger.info(`PDF salvo com sucesso: ${destinationPath}`, {
        fileSize: Math.round(pdfBuffer.length / 1024) + 'KB'
      });

      // Retornar URL relativa do arquivo
      return `/pdfs/${fileName}`;
    } catch (error) {
      logger.error('Erro ao fazer upload do PDF', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        bookId,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  public async saveImage(imageBuffer: Buffer, bookId: string): Promise<string> {
    try {
      const fileName = `${uuidv4()}.jpg`;
      const filePath = path.join(this.imagesDir, fileName);

      // Salva a imagem
      fs.writeFileSync(filePath, imageBuffer);

      // Retorna a URL relativa da imagem
      return `/images/${fileName}`;
    } catch (error) {
      logger.error('Erro ao salvar imagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        bookId
      });
      throw error;
    }
  }

  public async getImageUrl(imagePath: string): Promise<string> {
    try {
      // Se a imagem já for uma URL externa, retorna ela mesma
      if (imagePath.startsWith('http')) {
        return imagePath;
      }

      // Se a imagem for uma URL relativa, retorna o caminho completo
      if (imagePath.startsWith('/')) {
        return imagePath;
      }

      // Se a imagem for um caminho local, retorna a URL relativa
      return `/images/${path.basename(imagePath)}`;
    } catch (error) {
      logger.error('Erro ao obter URL da imagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        imagePath
      });
      throw error;
    }
  }
}

export const storageService = new StorageService(); 