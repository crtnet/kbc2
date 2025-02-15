import mongoose from 'mongoose';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

async function systemDiagnostics() {
  console.log('=== Sistema Diagnostics ===');
  console.log('Plataforma:', os.platform());
  console.log('Arquitetura:', os.arch());
  console.log('Versão do Node:', process.version);
  
  try {
    const { version } = require('mongoose/package.json');
    console.log('Versão do Mongoose:', version);
  } catch (error) {
    console.error('Erro ao obter versão do Mongoose:', error);
  }
}

async function checkMongoConnection() {
  console.log('\n=== Verificação de Conexão MongoDB ===');
  
  // Tenta ler variáveis de ambiente de diferentes locais
  const envFiles = [
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../.env'),
    path.join(process.cwd(), '.env')
  ];

  let mongoUri = process.env.MONGODB_URI;

  for (const envFile of envFiles) {
    if (!mongoUri && fs.existsSync(envFile)) {
      try {
        const envContent = fs.readFileSync(envFile, 'utf8');
        const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
        if (uriMatch) {
          mongoUri = uriMatch[1].trim();
          console.log(`URI encontrada no arquivo: ${envFile}`);
          break;
        }
      } catch (error) {
        console.error(`Erro ao ler ${envFile}:`, error);
      }
    }
  }

  if (!mongoUri) {
    mongoUri = 'mongodb://localhost:27017/kids-book-creator';
    console.warn('Usando URI padrão:', mongoUri);
  }

  console.log('URI de conexão:', mongoUri);

  try {
    mongoose.set('debug', true);

    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      autoIndex: true,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true
    };

    console.log('Tentando conectar...');
    await mongoose.connect(mongoUri, options);

    console.log('Conexão estabelecida com sucesso!');

    // Testa a conexão
    const db = mongoose.connection.db;
    const ping = await db.admin().ping();
    console.log('Ping do banco de dados:', ping);

    // Lista bancos de dados
    const adminDb = db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('Bancos de dados disponíveis:', dbs.databases.map(d => d.name));

    // Fecha a conexão
    await mongoose.disconnect();
    console.log('Conexão fechada com sucesso.');
  } catch (error) {
    console.error('\n=== Erro Detalhado na Conexão ===');
    console.error('Tipo de erro:', error instanceof Error ? error.name : 'Erro desconhecido');
    console.error('Mensagem de erro:', error instanceof Error ? error.message : error);
    
    if (error instanceof Error) {
      console.error('Stack de erro:', error.stack);
    }

    // Tenta identificar a causa raiz
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n!!! Possível causa: Servidor MongoDB não está rodando.');
      console.error('Verifique se o MongoDB está iniciado com: brew services start mongodb-community');
    } else if (error.message.includes('authentication')) {
      console.error('\n!!! Possível causa: Problema de autenticação.');
      console.error('Verifique as credenciais de conexão no .env');
    }
  }
}

async function main() {
  await systemDiagnostics();
  await checkMongoConnection();
}

main().catch(console.error);