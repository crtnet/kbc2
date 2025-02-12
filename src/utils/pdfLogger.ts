import winston from 'winston';

const pdfLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/pdf-generation.log' }),
    new winston.transports.Console()
  ]
});

export const logPdfGeneration = {
  start: (bookId: string) => {
    pdfLogger.info(`Iniciando geração do PDF para o livro ${bookId}`);
  },
  pageProcessing: (pageNumber: number, total: number) => {
    pdfLogger.info(`Processando página ${pageNumber} de ${total}`);
  },
  imageProcessing: (pageNumber: number) => {
    pdfLogger.info(`Processando imagem da página ${pageNumber}`);
  },
  error: (error: any, bookId: string) => {
    pdfLogger.error(`Erro na geração do PDF para o livro ${bookId}`, { error });
  },
  complete: (bookId: string, filePath: string) => {
    pdfLogger.info(`PDF gerado com sucesso para o livro ${bookId}`, { filePath });
  }
};