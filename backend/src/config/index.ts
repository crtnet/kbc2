import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kids-book-creator',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  // Configurações de diretórios
  publicDirectory: path.resolve(__dirname, '../../public'),
  pdfDirectory: path.resolve(__dirname, '../../public/pdfs'),
  
  // URL base da API
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
};