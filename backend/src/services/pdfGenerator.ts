import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IBook, IPage } from '../models/Book';
import { logger } from '../utils/logger';
import { pdfLogger } from '../utils/pdfLogger';
import axios from 'axios';
import { storageService } from './storage.service';
import sharp from 'sharp';
import os from 'os';

interface PDFOptions {
  pageSize?: string;
  margin?: number;
}

async function downloadAndOptimizeImage(imageUrl: string): Promise<Buffer> {
  try {
    pdfLogger.info(`Iniciando download da imagem: ${imageUrl}`);
    
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);
    
    pdfLogger.info(`Imagem baixada com sucesso: ${imageUrl}`, {
      size: Math.round(imageBuffer.length / 1024) + 'KB'
    });
    
    // Otimiza a imagem
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(800, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    pdfLogger.info(`Imagem otimizada com sucesso: ${imageUrl}`, {
      originalSize: Math.round(imageBuffer.length / 1024) + 'KB',
      optimizedSize: Math.round(optimizedBuffer.length / 1024) + 'KB'
    });
    
    return optimizedBuffer;
  } catch (error) {
    pdfLogger.error(`Erro ao baixar ou otimizar imagem: ${imageUrl}`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function generatePDF(book: IBook, options: PDFOptions = {}): Promise<string> {
  const {
    pageSize = 'A4',
    margin = 50
  } = options;

  pdfLogger.info(`Iniciando geração de PDF para o livro: ${book.title}`, {
    bookId: book._id,
    pageCount: book.pages.length,
    options
  });

  // Cria o diretório temporário para o PDF
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const outputPath = path.join(tempDir, `${book._id}.pdf`);
  const writeStream = fs.createWriteStream(outputPath);
  
  try {
    const doc = new PDFDocument({
      size: pageSize,
      margin: margin,
      bufferPages: true
    });

    // Pipe do PDF para o arquivo
    doc.pipe(writeStream);

    // Adiciona a capa
    doc.addPage();
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .text(book.title, 0, 100, {
        align: 'center',
        width: doc.page.width
      })
      .fontSize(16)
      .font('Helvetica')
      .text(`por ${book.authorName || 'Anônimo'}`, 0, 150, {
        align: 'center',
        width: doc.page.width
      });

    pdfLogger.info('Capa do livro adicionada com sucesso');

    // Adiciona as páginas ao PDF
    for (const page of book.pages) {
      doc.addPage();
      pdfLogger.info(`Processando página ${page.pageNumber}`);

      if (page.imageUrl) {
        try {
          const imageBuffer = await downloadAndOptimizeImage(page.imageUrl);
          doc.image(imageBuffer, {
            fit: [doc.page.width - 2 * margin, doc.page.height - 2 * margin],
            align: 'center',
            valign: 'center'
          });
          pdfLogger.info(`Imagem adicionada com sucesso na página ${page.pageNumber}`);
        } catch (error) {
          pdfLogger.warn(`Não foi possível adicionar imagem da página ${page.pageNumber}`, {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      }

      if (page.text) {
        doc.fontSize(12)
          .font('Helvetica')
          .text(page.text, {
            align: 'justify',
            width: doc.page.width - 2 * margin
          });
        pdfLogger.info(`Texto adicionado com sucesso na página ${page.pageNumber}`);
      }
    }

    // Finaliza o PDF
    doc.end();

    // Aguarda a finalização do stream
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    pdfLogger.info(`PDF gerado com sucesso em: ${outputPath}`);

    // Lê o arquivo PDF gerado
    const pdfBuffer = await fs.promises.readFile(outputPath);
    pdfLogger.info(`PDF lido com sucesso, tamanho: ${Math.round(pdfBuffer.length / 1024)}KB`);

    // Salva o PDF usando o storageService
    const pdfUrl = await storageService.uploadPDFToStorage(pdfBuffer, book._id);

    // Remove o arquivo temporário
    await fs.promises.unlink(outputPath);
    pdfLogger.info(`Arquivo temporário removido: ${outputPath}`);

    pdfLogger.info(`PDF final gerado com sucesso: ${pdfUrl}`, {
      bookId: book._id,
      fileSize: `${Math.round(pdfBuffer.length / 1024)}KB`
    });

    return pdfUrl;
  } catch (error) {
    pdfLogger.error(`Erro ao gerar PDF para o livro ${book._id}:`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}