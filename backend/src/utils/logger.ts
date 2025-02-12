import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
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
    })
  ]
});

// Criar diretório de logs se não existir
import fs from 'fs-extra';
fs.ensureDirSync(path.join(__dirname, '../../logs'));