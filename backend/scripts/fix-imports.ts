/**
 * Script para verificar e corrigir problemas de importação no código
 * 
 * Este script analisa os arquivos TypeScript do projeto e identifica
 * importações problemáticas, sugerindo correções.
 * 
 * Uso: ts-node scripts/fix-imports.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);

// Configurações
const SRC_DIR = path.join(__dirname, '../src');
const EXTENSIONS = ['.ts', '.tsx'];
const IGNORE_DIRS = ['node_modules', 'dist', 'build', 'coverage'];

// Padrões de importação problemáticos
const PROBLEMATIC_IMPORTS = [
  { 
    pattern: /from\s+['"]\.\.\/services\/avatarFix\.service['"]/g, 
    replacement: 'from \'../services/avatarFixService\'',
    description: 'Importação incorreta do serviço de avatar'
  },
  { 
    pattern: /from\s+['"]\.\.\/services\/avatarFixService['"]/g, 
    replacement: 'from \'../services\'',
    description: 'Importação direta em vez de centralizada'
  },
  { 
    pattern: /from\s+['"]\.\.\/config\/api['"]/g, 
    replacement: 'from \'../config\'',
    description: 'Importação de arquivo de configuração API separado'
  },
  { 
    pattern: /import\s+{\s*API_URL\s*}\s+from\s+['"]\.\.\/config\/api['"]/g, 
    replacement: 'import { config } from \'../config\'\nconst API_URL = config.apiUrl',
    description: 'Importação de API_URL de arquivo separado'
  },
  // Adicione mais padrões conforme necessário
];

/**
 * Verifica se um diretório deve ser ignorado
 */
function shouldIgnoreDir(dirPath: string): boolean {
  const dirName = path.basename(dirPath);
  return IGNORE_DIRS.includes(dirName);
}

/**
 * Verifica se um arquivo deve ser processado
 */
function shouldProcessFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  return EXTENSIONS.includes(ext);
}

/**
 * Processa um arquivo para encontrar e corrigir importações problemáticas
 */
async function processFile(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;

    for (const importIssue of PROBLEMATIC_IMPORTS) {
      if (importIssue.pattern.test(content)) {
        console.log(`\x1b[33m[ENCONTRADO]\x1b[0m ${importIssue.description} em ${filePath}`);
        newContent = newContent.replace(importIssue.pattern, importIssue.replacement);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await writeFile(filePath, newContent, 'utf8');
      console.log(`\x1b[32m[CORRIGIDO]\x1b[0m ${filePath}`);
    }
  } catch (error) {
    console.error(`\x1b[31m[ERRO]\x1b[0m Falha ao processar ${filePath}:`, error);
  }
}

/**
 * Percorre recursivamente um diretório para processar arquivos
 */
async function processDirectory(dirPath: string): Promise<void> {
  if (shouldIgnoreDir(dirPath)) {
    return;
  }

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(entryPath);
      } else if (shouldProcessFile(entryPath)) {
        await processFile(entryPath);
      }
    }
  } catch (error) {
    console.error(`\x1b[31m[ERRO]\x1b[0m Falha ao processar diretório ${dirPath}:`, error);
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('\x1b[36m[INICIANDO]\x1b[0m Verificação de importações problemáticas...');
  
  try {
    await processDirectory(SRC_DIR);
    console.log('\x1b[36m[CONCLUÍDO]\x1b[0m Verificação de importações finalizada.');
  } catch (error) {
    console.error('\x1b[31m[ERRO FATAL]\x1b[0m:', error);
    process.exit(1);
  }
}

// Executa o script
main();