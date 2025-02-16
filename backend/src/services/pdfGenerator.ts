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
  format: 'A4', // ou 'A3' se preferir
  margins: {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  },
  fonts: {
    regular: path.join(__dirname, '../../assets/fonts/OpenSans-Regular.ttf'),
    bold: path.join(__dirname, '../../assets/fonts/OpenSans-Bold.ttf'),
    italic: path.join(__dirname, '../../assets/fonts/OpenSans-Italic.ttf'),
  },
};

async function downloadImage(url: string, localPath: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(localPath, response.data);
    return localPath;
  } catch (error: any) {
    logger.error(`Erro ao baixar imagem de ${url}: ${error.message}`);
    throw error;
  }
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
      // Prepara as imagens para cada página
      const imageMap = await prepareImages(book);

      // Configura o diretório de saída para o PDF
      const pdfDir = path.join(__dirname, '../../public/pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // Nome do arquivo baseado no ID do livro
      const pdfFilename = `${book._id}.pdf`;
      const pdfPath = path.join(pdfDir, pdfFilename);
      const stream = fs.createWriteStream(pdfPath);
      
      // Cria o documento PDF
      const doc = new PDFDocument({
        size: options.format,
        margins: options.margins,
        autoFirstPage: false
      });
      doc.pipe(stream);

      // Registra fontes personalizadas
      if (options.fonts) {
        doc.registerFont('Regular', options.fonts.regular);
        doc.registerFont('Bold', options.fonts.bold);
        doc.registerFont('Italic', options.fonts.italic);
      }

      // Gera uma página para cada página do livro
      for (const page of book.pages) {
        doc.addPage();
        
        // Escreve o texto da página
        doc.font('Regular')
           .fontSize(12)
           .text(page.text, {
             align: 'justify',
             paragraphGap: 10,
           });
        
        // Se houver imagem para essa página, adiciona a imagem
        if (imageMap.has(page.pageNumber)) {
          const imagePath = imageMap.get(page.pageNumber)!;
          try {
            // Adiciona a imagem centralizada, ajustando o tamanho conforme necessário
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
        // Remove arquivos temporários (imagens baixadas)
        imageMap.forEach((imgPath) => {
          if (imgPath.includes('temp') && fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
          }
        });

        // Retorna o caminho relativo do PDF (para acesso via web, por exemplo)
        const relativePdfPath = `/pdfs/${pdfFilename}`;
        logger.info('PDF gerado com sucesso', { 
          bookId: book._id, 
          pdfPath: relativePdfPath,
          fullPath: pdfPath 
        });
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

export { defaultOptions };