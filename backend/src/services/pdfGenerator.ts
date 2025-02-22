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

      // Adiciona capa personalizada
      doc.addPage();
      
      // Configura dimensões da página
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Estilos de capa
      const coverStyle = book.coverStyle || {};
      const backgroundColor = coverStyle.backgroundColor || '#F0F0F0';
      const titleColor = coverStyle.titleColor || '#333333';
      const authorColor = coverStyle.authorColor || '#666666';
      const titleFontSize = coverStyle.titleFontSize || 24;
      const authorFontSize = coverStyle.authorFontSize || 12;
      const coverImageStyle = coverStyle.coverImageStyle || {};

      // Adiciona cor de fundo suave
      doc
        .rect(0, 0, pageWidth, pageHeight)
        .fill(backgroundColor);

      // Adiciona imagem de fundo (opcional)
      if (book.pages[0]?.imageUrl) {
        try {
          const coverImagePath = imageMap.get(1);
          if (coverImagePath) {
            const imageWidth = pageWidth * (coverImageStyle.width || 0.8);
            const imageHeight = pageHeight * (coverImageStyle.height || 0.6);
            const opacity = coverImageStyle.opacity || 1;

            doc.opacity(opacity);
            doc.image(coverImagePath, {
              width: imageWidth,
              height: imageHeight,
              align: 'center',
              valign: 'center',
              x: pageWidth * ((1 - (coverImageStyle.width || 0.8)) / 2),
              y: pageHeight * 0.2
            });
            doc.opacity(1); // Restaura opacidade
          }
        } catch (imgErr) {
          logger.warn('Erro ao adicionar imagem de capa', { error: imgErr });
        }
      }

      // Título do livro no topo
      doc
        .fontSize(titleFontSize)
        .font('Helvetica-Bold')
        .fillColor(titleColor)
        .text(book.title, {
          align: 'center',
          y: 100
        });

      // Autor no rodapé
      doc
        .fontSize(authorFontSize)
        .font('Helvetica')
        .fillColor(authorColor)
        .text(`Autor: ${book.authorName || 'Anônimo'}`, {
          align: 'center',
          y: pageHeight - 100
        });

      // Adiciona decorações (opcional)
      doc
        .lineWidth(2)
        .strokeColor('#999999')
        .moveTo(50, 50)
        .lineTo(pageWidth - 50, 50)
        .stroke();

      doc
        .lineWidth(2)
        .strokeColor('#999999')
        .moveTo(50, pageHeight - 50)
        .lineTo(pageWidth - 50, pageHeight - 50)
        .stroke();

      // Adiciona as páginas do livro
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