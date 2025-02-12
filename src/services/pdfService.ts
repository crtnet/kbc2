import PDFDocument from 'pdfkit';
import fs from 'fs';
import { logPdfGeneration } from '../utils/pdfLogger';

export class PdfService {
  async generateBookPdf(book: any, outputPath: string): Promise<string> {
    try {
      logPdfGeneration.start(book._id);
      
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(outputPath);
      
      doc.pipe(stream);
      
      // Capa
      doc.fontSize(24).text(book.title, { align: 'center' });
      doc.moveDown();
      
      // Páginas do livro
      for (let i = 0; i < book.pages.length; i++) {
        const page = book.pages[i];
        logPdfGeneration.pageProcessing(i + 1, book.pages.length);
        
        if (i > 0) doc.addPage();
        
        // Processar imagem
        if (page.imageUrl) {
          try {
            logPdfGeneration.imageProcessing(i + 1);
            doc.image(page.imageUrl, {
              fit: [500, 300],
              align: 'center'
            });
          } catch (error) {
            logPdfGeneration.error(error, book._id);
          }
        }
        
        doc.moveDown();
        doc.fontSize(12).text(page.text, {
          align: 'left',
          width: 500
        });
      }
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          logPdfGeneration.complete(book._id, outputPath);
          resolve(outputPath);
        });
        
        stream.on('error', (error) => {
          logPdfGeneration.error(error, book._id);
          reject(error);
        });
      });
      
    } catch (error) {
      logPdfGeneration.error(error, book._id);
      throw error;
    }
  }
}