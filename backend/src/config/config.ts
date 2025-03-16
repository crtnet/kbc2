import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no arquivo .env');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI não definido no arquivo .env');
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não definido no arquivo .env');
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
    imageSize: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
    imageQuality: process.env.OPENAI_IMAGE_QUALITY || 'standard',
    imageStyle: process.env.OPENAI_IMAGE_STYLE || 'natural'
  }
};