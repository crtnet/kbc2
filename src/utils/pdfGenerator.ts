import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Book } from '../models/Book';
import logger from '../config/logger';

export async function generatePDF(book: Book): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Criar diretório de PDFs se não existir
      const pdfDir = path.join(__dirname, '..', '..', 'public', 'pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // Nome do arquivo PDF
      const fileName = `${book._id}_${Date.now()}.pdf`;
      const pdfPath = path.join(pdfDir, fileName);

      // Criar novo documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        autoFirstPage: false
      });

      // Pipe do PDF para arquivo
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Adicionar páginas ao PDF
      book.pages.forEach((page, index) => {
        // Adicionar nova página
        doc.addPage();

        // Adicionar imagem
        if (page.imageUrl) {
          try {
            const imagePath = path.join(__dirname, '..', '..', 'public', page.imageUrl);
            doc.image(imagePath, {
              fit: [500, 400],
              align: 'center',
              valign: 'center'
            });
          } catch (error) {
            logger.error(`Erro ao adicionar imagem da página ${index + 1}:`, error);
          }
        }

        // Adicionar texto
        if (page.text) {
          doc.moveDown();
          doc.fontSize(12).text(page.text, {
            align: 'center'
          });
        }

        // Adicionar número da página
        doc.fontSize(10)
           .text(
             `${index + 1}/${book.pages.length}`,
             doc.page.width - 50,
             doc.page.height - 50,
             { align: 'right' }
           );
      });

      // Finalizar PDF
      doc.end();

      // Quando o stream terminar, resolver a promise com o caminho do arquivo
      stream.on('finish', () => {
        const publicPath = `/pdfs/${fileName}`;
        resolve(publicPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}