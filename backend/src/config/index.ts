import { config as appConfig } from './config';
import { openaiConfig } from './openai';
import path from 'path';

// Merge configs and export
export const config = {
  ...appConfig,
  openai: {
    ...appConfig.openai,
    ...openaiConfig
  },
  // Configurações de diretórios adicionais
  publicDirectory: path.resolve(__dirname, '../../public'),
  pdfDirectory: path.resolve(__dirname, '../../public/pdfs'),
  
  // URL base da API
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
};