// services/pdfGenerator.ts
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
  format: 'A4', // Se desejar A3 por padrão, altere para 'A3'
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
      // Prepara as imagens para cada página
      const imageMap = await prepareImages(book);

      // Configura o documento PDF com o tamanho definido (ex.: A3)
      const doc = new PDFDocument({
        size: options.format,
        margins: options.margins,
        autoFirstPage: false
      });

      // Configura o diretório de saída para o PDF
      const pdfDir = path.join(__dirname, '../../public/pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      const pdfPath = path.join(pdfDir, `${book._id}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Registra as fontes personalizadas e loga os caminhos para depuração
      if (options.fonts) {
        logger.info(`Usando fonte Regular: ${options.fonts.regular}`);
        logger.info(`Usando fonte Bold: ${options.fonts.bold}`);
        logger.info(`Usando fonte Italic: ${options.fonts.italic}`);
        doc.registerFont('Regular', options.fonts.regular);
        doc.registerFont('Bold', options.fonts.bold);
        doc.registerFont('Italic', options.fonts.italic);
      }

      // Cria a capa do livro
      doc.addPage();
      doc.font('Bold')
        .fontSize(36)
        .fillColor('black')
        .text(book.title, { align: 'center', valign: 'center' });
      doc.moveDown(2);
      doc.font('Regular')
        .fontSize(16)
        .fillColor('black')
        .text(`Por: ${book.mainCharacter}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14)
        .fillColor('black')
        .text(`Gênero: ${book.genre}`, { align: 'center' });
      doc.moveDown();
      doc.text(`Faixa etária: ${book.ageRange} anos`, { align: 'center' });

      // Página de informações do livro
      doc.addPage();
      doc.font('Bold')
        .fontSize(18)
        .fillColor('black')
        .text('Informações do Livro', { align: 'center' });
      doc.moveDown();
      doc.font('Regular')
        .fontSize(12)
        .fillColor('black')
        .text(`Tema: ${book.theme}`)
        .moveDown()
        .text(`Cenário: ${book.setting}`)
        .moveDown()
        .text(`Tom: ${book.tone}`)
        .moveDown()
        .text(`Idioma: ${book.language}`);

      // Conteúdo do livro: para cada página, cria uma nova página com imagem de fundo e sobreposição semitransparente para o texto
      for (const page of book.pages) {
        doc.addPage();
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Se houver imagem, desenha a imagem de fundo cobrindo toda a página
        const imagePath = imageMap.get(page.pageNumber);
        if (imagePath && fs.existsSync(imagePath)) {
          try {
            doc.image(imagePath, 0, 0, { width: pageWidth, height: pageHeight });
            // Sobreposição: desenha um retângulo branco com opacidade reduzida
            doc.fillOpacity(0.6);
            doc.rect(0, 0, pageWidth, pageHeight).fill('white');
            doc.fillOpacity(1); // Restaura opacidade total para o texto
          } catch (err) {
            logger.error(`Erro ao adicionar imagem de fundo na página ${page.pageNumber}: ${err.message}`);
          }
        }
        
        // Adiciona o número da página no topo
        doc.font('Regular')
          .fontSize(12)
          .fillColor('black')
          .text(`Página ${page.pageNumber}`, { align: 'center', underline: true });
        doc.moveDown();

        // Adiciona o texto da página com margens definidas
        doc.font('Regular')
          .fontSize(14)
          .fillColor('black')
          .text(page.text, {
            align: 'justify',
            lineGap: 5,
            width: pageWidth - 2 * options.margins.left
          });
      }

      // Define metadados do PDF
      doc.info['Title'] = book.title;
      doc.info['Author'] = book.mainCharacter;
      doc.info['Subject'] = book.theme;
      doc.info['Keywords'] = `${book.genre}, ${book.theme}, ${book.ageRange} anos`;

      // Finaliza o documento PDF
      doc.end();

      stream.on('finish', () => {
        // Remove arquivos temporários (imagens baixadas)
        imageMap.forEach((imgPath) => {
          if (imgPath.includes('temp') && fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
          }
        });
        // Retorna a URL relativa para acessar o PDF (exemplo: /pdfs/{bookId}.pdf)
        resolve(`/pdfs/${book._id}.pdf`);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      logger.error(`Erro ao gerar PDF: ${error.message}`);
      reject(error);
    }
  });
}

export { defaultOptions };
