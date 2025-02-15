import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no arquivo .env');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI não definido no arquivo .env');
}

export const config = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRATION || '24h',
  mongoUri: process.env.MONGODB_URI,
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:19006',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  pdfOutputDir: process.env.PDF_OUTPUT_DIR || './storage/pdfs',
  imageOutputDir: process.env.IMAGE_OUTPUT_DIR || './storage/images'
};