import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger';
import { Book } from '../models/Book';

export class PDFService {
  private static instance: PDFService;

  private constructor() {}

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  public async generateBookPDF(book: Book): Promise<{ filename: string, filepath: string }> {
    try {
      logger.info(`Iniciando geração de PDF para o livro: ${book.title}`);
      
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      // Criar diretório para PDFs se não existir
      const pdfDir = path.join(__dirname, '../../public/pdfs');
      await fs.ensureDir(pdfDir);

      const filename = `${book._id}-${Date.now()}.pdf`;
      const filepath = path.join(pdfDir, filename);
      const writeStream = fs.createWriteStream(filepath);

      // Pipe do PDF para o arquivo
      doc.pipe(writeStream);

      // Capa do livro
      doc.fontSize(30)
         .font('Helvetica-Bold')
         .text(book.title, { align: 'center' });
      
      doc.moveDown(2);
      
      // Informações do livro
      doc.fontSize(14)
         .font('Helvetica')
         .text(`Personagem Principal: ${book.mainCharacter}`, { align: 'center' });
      
      doc.moveDown();
      
      // Adicionar cada página do livro
      book.pages.forEach((page, index) => {
        if (index > 0) doc.addPage();
        
        // Adicionar imagem se existir
        if (page.imageUrl) {
          doc.image(page.imageUrl, {
            fit: [700, 400],
            align: 'center'
          });
        }
        
        doc.moveDown();
        
        // Texto da página
        doc.fontSize(16)
           .font('Helvetica')
           .text(page.text, {
             align: 'justify',
             columns: 1
           });
      });

      // Finalizar o PDF
      doc.end();

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          logger.info(`PDF gerado com sucesso: ${filename}`);
          resolve({
            filename,
            filepath: `/pdfs/${filename}`
          });
        });
        writeStream.on('error', (error) => {
          logger.error(`Erro ao gerar PDF: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`Erro ao gerar PDF: ${error.message}`);
      throw error;
    }
  }
}

export default PDFService.getInstance();