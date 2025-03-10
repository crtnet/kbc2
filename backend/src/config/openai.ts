import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Verifica se a chave da API está definida
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  logger.error('OPENAI_API_KEY não está definida no arquivo .env');
  // Em vez de lançar um erro, vamos usar uma chave fictícia para desenvolvimento
  // Isso permitirá que o servidor inicie, mas as chamadas à API falharão
  // Em produção, isso deve ser substituído por uma chave válida
}

export const openaiConfig = {
  apiKey: apiKey || 'sk-dummy-key-for-development-only',
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  timeoutMs: parseInt(process.env.OPENAI_TIMEOUT || '60000', 10), // 60 segundos de timeout
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.OPENAI_RETRY_DELAY || '2000', 10), // 2 segundos
  imageSize: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
  imageQuality: process.env.OPENAI_IMAGE_QUALITY || 'standard',
  imageStyle: process.env.OPENAI_IMAGE_STYLE || 'natural',
};

// Log de configuração (sem mostrar a chave completa)
const maskedKey = apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}` : 'não definida';
logger.info('Configuração OpenAI carregada', {
  model: openaiConfig.model,
  apiKeyStatus: apiKey ? 'definida' : 'não definida',
  apiKeyMasked: maskedKey,
  maxTokens: openaiConfig.maxTokens,
  temperature: openaiConfig.temperature,
  imageSize: openaiConfig.imageSize,
  imageQuality: openaiConfig.imageQuality,
  imageStyle: openaiConfig.imageStyle,
});