import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export const ensureDirectories = () => {
  const directories = [
    'pdfs',
    'logs',
    'temp'
  ];

  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      logger.info(`[SETUP] Criando diretório: ${dir}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  logger.info('[SETUP] Diretórios verificados e criados se necessário');
};