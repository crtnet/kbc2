// src/config/api.ts
import dotenv from 'dotenv';

dotenv.config();

/**
 * URL base da API
 * Usado principalmente pelo frontend para fazer requisições ao backend
 */
export const API_URL = process.env.API_URL || 'http://localhost:3000/api';

/**
 * Timeout padrão para requisições à API (em milissegundos)
 */
export const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000', 10);

/**
 * Número máximo de tentativas para requisições à API
 */
export const API_MAX_RETRIES = parseInt(process.env.API_MAX_RETRIES || '3', 10);

/**
 * Intervalo entre tentativas de requisição (em milissegundos)
 */
export const API_RETRY_DELAY = parseInt(process.env.API_RETRY_DELAY || '1000', 10);