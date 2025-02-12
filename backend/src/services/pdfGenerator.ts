// services/pdfGenerator.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IBook } from '../models/Book';
import { logger } from '../utils/logger';
import axios from 'axios';

interface PDFOptions {
  format?: 'A4' | 'A5' | 'landscape';
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
    right: 72
  },
  fonts: {
    regular: path.join(__dirname, '../../assets/fonts/OpenSans-Regular.ttf'),
    bold: path.join(__dirname, '../../assets/fonts/OpenSans-Bold.ttf'),
    italic: path.join(__dirname, '../../assets/fonts/OpenSans-Italic.ttf')
  }
};

async function downloadImage(url: string, localPath: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(localPath, response.data);
    return localPath;
  } catch (error) {
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
      } catch (error) {
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
      // Prepara as imagens
      const imageMap = await prepareImages(book);

      // Configura o documento PDF
      const doc = new PDFDocument({
        size: options.format,
        margins: options.margins,
        autoFirstPage: false
      });

      // Configura o diretório de saída
      const pdfDir = path.join(__dirname, '../../public/pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      const pdfPath = path.join(pdfDir, `${book._id}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Registra as fontes personalizadas
      if (options.fonts) {
        doc.registerFont('Regular', options.fonts.regular);
        doc.registerFont('Bold', options.fonts.bold);
        doc.registerFont('Italic', options.fonts.italic);
      }

      // Capa do livro
      doc.addPage();
      doc.font('Bold')
        .fontSize(36)
        .text(book.title, { align: 'center', valign: 'center' });
      
      doc.moveDown(2);
      doc.font('Regular')
        .fontSize(16)
        .text(`Por: ${book.mainCharacter}`, { align: 'center' });

      doc.moveDown();
      doc.fontSize(14)
        .text(`Gênero: ${book.genre}`, { align: 'center' });
      
      doc.moveDown();
      doc.text(`Faixa etária: ${book.ageRange} anos`, { align: 'center' });

      // Adiciona informações do livro
      doc.addPage();
      doc.font('Bold')
        .fontSize(18)
        .text('Informações do Livro', { align: 'center' });
      
      doc.moveDown();
      doc.font('Regular')
        .fontSize(12)
        .text(`Tema: ${book.theme}`)
        .moveDown()
        .text(`Cenário: ${book.setting}`)
        .moveDown()
        .text(`Tom: ${book.tone}`)
        .moveDown()
        .text(`Idioma: ${book.language}`);

      // Conteúdo do livro
      for (const page of book.pages) {
        doc.addPage();

        // Número da página
        doc.font('Regular')
          .fontSize(12)
          .text(`${page.pageNumber}`, { align: 'center' });

        doc.moveDown();

        // Imagem da página
        const imagePath = imageMap.get(page.pageNumber);
        if (imagePath && fs.existsSync(imagePath)) {
          try {
            doc.image(imagePath, {
              fit: [400, 300],
              align: 'center'
            });
            doc.moveDown();
          } catch (err) {
            logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${err.message}`);
          }
        }

        // Texto da página
        doc.font('Regular')
          .fontSize(12)
          .text(page.text, {
            align: 'justify',
            lineGap: 5
          });
      }

      // Adiciona metadados ao PDF
      doc.info['Title'] = book.title;
      doc.info['Author'] = book.mainCharacter;
      doc.info['Subject'] = book.theme;
      doc.info['Keywords'] = `${book.genre}, ${book.theme}, ${book.ageRange} anos`;

      // Finaliza o documento
      doc.end();

      stream.on('finish', () => {
        // Limpa arquivos temporários
        imageMap.forEach((imagePath) => {
          if (imagePath.includes('temp') && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });

        // Retorna a URL relativa para acessar o PDF
        resolve(`/pdfs/${book._id}.pdf`);
      });

    } catch (error) {
      logger.error(`Erro ao gerar PDF: ${error.message}`);
      reject(error);
    }
  });
}
