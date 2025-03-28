import dotenv from 'dotenv';
import path from 'path';
import { redisConfig } from './redis';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no arquivo .env');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI não definido no arquivo .env');
}

// Verifica se deve pular a validação da chave da API OpenAI
const skipOpenAIValidation = process.env.SKIP_OPENAI_KEY_VALIDATION === 'true';

if (!process.env.OPENAI_API_KEY && !skipOpenAIValidation) {
  throw new Error('OPENAI_API_KEY não definido no arquivo .env');
}

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kbc2',
  redis: redisConfig,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    uploadDir: process.env.UPLOAD_DIR || 'uploads'
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:19006',
  logLevel: process.env.LOG_LEVEL || 'info',
  pdfOutputDir: process.env.PDF_OUTPUT_DIR || './storage/pdfs',
  imageOutputDir: process.env.IMAGE_OUTPUT_DIR || './storage/images',
  // Configuração para o servidor de avatares
  avatarServer: process.env.AVATAR_SERVER_URL || 'http://localhost:3000',
  // Configurações de timeouts e tentativas
  downloadTimeout: parseInt(process.env.DOWNLOAD_TIMEOUT || '60000', 10),  // 60 segundos
  openaiTimeout: parseInt(process.env.OPENAI_TIMEOUT || '120000', 10),     // 120 segundos
  maxDownloadRetries: parseInt(process.env.MAX_DOWNLOAD_RETRIES || '5', 10), // 5 tentativas
  // Configurações de dimensões de imagem para livro A5
  bookImageWidth: 420,  // Largura ideal para A5
  bookImageHeight: 595, // Altura ideal para A5
  // Limite de tamanho de arquivo para imagens
  maxImageSizeMB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '2', 10),  // 2MB,
  // Configurações da OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
    model: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.7,
    imageSize: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
    imageQuality: process.env.OPENAI_IMAGE_QUALITY || 'standard',
    imageStyle: process.env.OPENAI_IMAGE_STYLE || 'natural'
  }
};