import winston from 'winston';
import path from 'path';

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    // Verifica se a mensagem contém "Prompt DALL-E" para formatação especial
    if (info.message.includes('Prompt DALL-E')) {
      return `${info.timestamp} ${info.level}: [Prompt DALL-E] ${JSON.stringify(info.message)}${
        info[Symbol.for('splat')] ? ' ' + JSON.stringify(info[Symbol.for('splat')][0]) : ''
      }`;
    }
    
    // Formato padrão para outros logs
    return `${info.timestamp} ${info.level}: ${info.message}${
      info[Symbol.for('splat')] ? ' ' + JSON.stringify(info[Symbol.for('splat')][0]) : ''
    }`;
  })
);

export const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Log para console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    
    // Log de erros em arquivo
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }),
    
    // Log de informações em arquivo
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log')
    }),
    
    // Log específico para prompts DALL-E
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/dalle-prompts.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf((info) => {
          if (info.message.includes('Prompt DALL-E')) {
            return `${info.timestamp} ${info.level}: ${info.message} ${
              info[Symbol.for('splat')] ? JSON.stringify(info[Symbol.for('splat')][0]) : ''
            }`;
          }
          return null; // Não registra mensagens que não são prompts DALL-E
        })
      )
    })
  ]
});

// Criar diretório de logs se não existir
import fs from 'fs-extra';
fs.ensureDirSync(path.join(__dirname, '../../logs'));