// /src/services/pdfGenerator.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IBook } from '../models/Book';
import { logger } from '../utils/logger';
import axios from 'axios';

interface PDFOptions {
  format?: 'A3' | 'A4' | 'A5' | 'landscape';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fonts?: {
    regular: string;
    bold: string;
    italic: string;
  };
}

const defaultOptions: PDFOptions = {
  format: 'A4',
  margins: {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  },
};

async function downloadImage(url: string, localPath: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(localPath, response.data);
  return localPath;
}

async function prepareImages(book: IBook): Promise<Map<number, string>> {
  const imageMap = new Map<number, string>();
  const tempDir = path.join(__dirname, '../../temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (const page of book.pages) {
    if (page.imageUrl && page.imageUrl.startsWith('http')) {
      const localPath = path.join(tempDir, `${book._id}_page_${page.pageNumber}.jpg`);
      try {
        await downloadImage(page.imageUrl, localPath);
        imageMap.set(page.pageNumber, localPath);
      } catch (error: any) {
        logger.error(`Erro ao preparar imagem para página ${page.pageNumber}: ${error.message}`);
      }
    } else if (page.imageUrl) {
      // Se for um caminho local, usa diretamente
      imageMap.set(page.pageNumber, path.join(__dirname, '../../public', page.imageUrl));
    }
  }

  return imageMap;
}

export async function generateBookPDF(book: IBook, options: PDFOptions = defaultOptions): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const imageMap = await prepareImages(book);

      // Pasta onde realmente salvamos o PDF
      const pdfDir = path.join(__dirname, '../../public/pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // Nome do arquivo PDF
      const pdfFilename = `${book._id}.pdf`;
      // Caminho absoluto onde criaremos o PDF
      const absolutePdfPath = path.join(pdfDir, pdfFilename);
      // Caminho relativo que vamos guardar no banco
      const relativePdfPath = `/pdfs/${pdfFilename}`;

      const stream = fs.createWriteStream(absolutePdfPath);
      const doc = new PDFDocument({
        size: options.format,
        margins: options.margins,
        autoFirstPage: false
      });
      doc.pipe(stream);

      // Exemplo: Se quiser registrar fontes, pode manter
      // doc.registerFont('Regular', path.join(__dirname, '../../assets/fonts/OpenSans-Regular.ttf'));

      for (const page of book.pages) {
        doc.addPage();
        doc.fontSize(12).text(page.text || '', {
          align: 'justify',
          paragraphGap: 10,
        });

        if (imageMap.has(page.pageNumber)) {
          const imagePath = imageMap.get(page.pageNumber)!;
          try {
            doc.moveDown();
            doc.image(imagePath, {
              fit: [400, 300],
              align: 'center',
              valign: 'center'
            });
          } catch (imgErr: any) {
            logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`);
          }
        }
      }

      doc.end();

      stream.on('finish', () => {
        // Limpa as imagens temporárias
        imageMap.forEach((imgPath) => {
          if (imgPath.includes('temp') && fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
          }
        });

        logger.info('PDF gerado com sucesso', { 
          bookId: book._id, 
          pdfPath: relativePdfPath,
          absolutePdfPath
        });
        // Retorna apenas o caminho relativo
        resolve(relativePdfPath);
      });

      stream.on('error', (err) => {
        logger.error('Erro ao gerar stream do PDF', { error: err.message });
        reject(err);
      });
    } catch (error: any) {
      logger.error('Erro completo ao gerar PDF', { 
        bookId: book._id, 
        error: error.message,
        stack: error.stack 
      });
      reject(error);
    }
  });
}