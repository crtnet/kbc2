import winston from 'winston';
import path from 'path';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'error.log'),
      level: 'error'
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'combined.log')
    })
  ]
});

export default logger;