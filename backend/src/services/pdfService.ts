import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger';
import Book from '../models/Book';
import { performance } from 'perf_hooks';

interface TimingMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class PDFService {
  private static instance: PDFService;
  private metrics: { [key: string]: TimingMetrics } = {};

  private constructor() {}

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  private startTiming(stage: string) {
    this.metrics[stage] = {
      startTime: performance.now()
    };
    logger.info(`Iniciando ${stage}...`);
  }

  private endTiming(stage: string) {
    if (this.metrics[stage]) {
      this.metrics[stage].endTime = performance.now();
      this.metrics[stage].duration = this.metrics[stage].endTime - this.metrics[stage].startTime;
      logger.info(`${stage} concluído em ${(this.metrics[stage].duration / 1000).toFixed(2)} segundos`);
    }
  }

  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      return contentType?.startsWith('image/') || false;
    } catch {
      return false;
    }
  }

  private async generateCoverPage(doc: PDFKit.PDFDocument, book: Book) {
    this.startTiming('Geração da Capa');
    
    // Adicionar fundo colorido à capa
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fill('#f0f0f0');

    // Título do livro
    doc.fontSize(48)
       .font('Helvetica-Bold')
       .fillColor('#333333')
       .text(book.title, 50, 150, {
         align: 'center',
         width: doc.page.width - 100
       });

    // Imagem da capa se existir
    if (book.coverImage) {
      try {
        const isValid = await this.validateImageUrl(book.coverImage);
        if (isValid) {
          doc.image(book.coverImage, {
            fit: [500, 300],
            align: 'center',
            valign: 'center'
          });
        }
      } catch (error) {
        logger.error(`Erro ao adicionar imagem da capa: ${error.message}`);
      }
    }

    // Informações adicionais
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#666666')
       .text(`Personagem Principal: ${book.mainCharacter}`, {
         align: 'center',
         width: doc.page.width - 100
       })
       .moveDown()
       .text(`Gênero: ${book.genre}`, {
         align: 'center'
       })
       .moveDown()
       .text(`Criado em: ${new Date().toLocaleDateString()}`, {
         align: 'center'
       });

    this.endTiming('Geração da Capa');
  }

  private async generateStoryPages(doc: PDFKit.PDFDocument, book: Book) {
    this.startTiming('Geração das Páginas');
    
    for (let i = 0; i < book.pages.length; i++) {
      const page = book.pages[i];
      logger.info(`Processando página ${i + 1} de ${book.pages.length}`);

      // Nova página para cada conteúdo (exceto primeira página após capa)
      if (i > 0) {
        doc.addPage();
      } else {
        doc.addPage();
      }

      // Adicionar número da página
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#999999')
         .text(`${i + 1}`, doc.page.width - 50, doc.page.height - 50);

      // Adicionar imagem se existir
      if (page.imageUrl) {
        this.startTiming(`Processamento de Imagem - Página ${i + 1}`);
        logger.info(`Validando imagem da página ${i + 1}: ${page.imageUrl}`);
        
        const isValidImage = await this.validateImageUrl(page.imageUrl);
        if (isValidImage) {
          try {
            doc.image(page.imageUrl, {
              fit: [500, 300],
              align: 'center'
            });
            logger.info(`Imagem adicionada com sucesso na página ${i + 1}`);
          } catch (error) {
            logger.error(`Erro ao adicionar imagem na página ${i + 1}: ${error.message}`);
          }
        } else {
          logger.warn(`URL de imagem inválida na página ${i + 1}: ${page.imageUrl}`);
        }
        this.endTiming(`Processamento de Imagem - Página ${i + 1}`);
      }

      // Adicionar texto da página
      doc.moveDown(2)
         .fontSize(14)
         .font('Helvetica')
         .fillColor('#333333')
         .text(page.text, {
           align: 'justify',
           width: doc.page.width - 100,
           columns: 1,
           columnGap: 20,
           height: doc.page.height - 350,
           ellipsis: true
         });

      logger.info(`Página ${i + 1} processada com sucesso`);
    }

    this.endTiming('Geração das Páginas');
  }

  public async generateBookPDF(book: Book): Promise<{ filename: string, filepath: string }> {
    const TIMEOUT = 5 * 60 * 1000; // 5 minutos
    this.metrics = {}; // Reset metrics
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout: A geração do PDF excedeu 5 minutos'));
      }, TIMEOUT);

      try {
        this.startTiming('Processo Completo');
        logger.info(`Iniciando geração de PDF para o livro: ${book.title}`);
        logger.info(`Número de páginas: ${book.pages.length}`);
        
        // Configuração do documento
        this.startTiming('Configuração do Documento');
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'portrait',
          margin: 50,
          bufferPages: true
        });
        this.endTiming('Configuração do Documento');

        // Criar diretório para PDFs
        const pdfDir = path.join(__dirname, '../../public/pdfs');
        await fs.ensureDir(pdfDir);

        const filename = `${book._id}-${Date.now()}.pdf`;
        const filepath = path.join(pdfDir, filename);
        const writeStream = fs.createWriteStream(filepath);

        // Pipe do PDF para o arquivo
        doc.pipe(writeStream);

        // Gerar capa
        await this.generateCoverPage(doc, book);

        // Gerar páginas da história
        await this.generateStoryPages(doc, book);

        // Finalizar o PDF
        this.startTiming('Finalização do PDF');
        doc.end();
        this.endTiming('Finalização do PDF');

        writeStream.on('finish', () => {
          clearTimeout(timeoutId);
          this.endTiming('Processo Completo');
          
          // Log final com todas as métricas
          const totalTime = this.metrics['Processo Completo'].duration / 1000;
          logger.info('=== Relatório de Geração do PDF ===');
          logger.info(`Tempo total: ${totalTime.toFixed(2)} segundos`);
          Object.entries(this.metrics).forEach(([stage, metrics]) => {
            if (stage !== 'Processo Completo') {
              const duration = (metrics.duration || 0) / 1000;
              const percentage = ((duration / totalTime) * 100).toFixed(1);
              logger.info(`${stage}: ${duration.toFixed(2)}s (${percentage}%)`);
            }
          });
          logger.info('================================');

          resolve({
            filename,
            filepath: `/pdfs/${filename}`
          });
        });

        writeStream.on('error', (error) => {
          clearTimeout(timeoutId);
          logger.error(`Erro ao gerar PDF: ${error.message}`);
          reject(error);
        });

      } catch (error) {
        clearTimeout(timeoutId);
        logger.error(`Erro ao gerar PDF: ${error.message}`);
        reject(error);
      }
    });
  }
}

export default PDFService.getInstance();