import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from '../config/config';
import { logger } from '../utils/logger';

async function createTestUser() {
  try {
    // Conectar ao banco de dados
    await mongoose.connect(config.database.uri);
    logger.info('Conectado ao banco de dados');

    // Verificar se o usuário já existe
    const existingUser = await User.findByEmail('crtnet@hotmail.com');
    
    if (existingUser) {
      logger.info('Usuário de teste já existe', { email: 'crtnet@hotmail.com' });
      await mongoose.disconnect();
      return;
    }

    // Criar hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('senha123', salt);

    // Criar o usuário de teste
    const testUser = new User({
      email: 'crtnet@hotmail.com',
      password: hashedPassword,
      name: 'Usuário de Teste',
      type: 'user'
    });

    await testUser.save();
    logger.info('Usuário de teste criado com sucesso', { email: 'crtnet@hotmail.com' });

    // Desconectar do banco de dados
    await mongoose.disconnect();
    logger.info('Desconectado do banco de dados');
  } catch (error) {
    logger.error('Erro ao criar usuário de teste:', error);
    process.exit(1);
  }
}

// Executar a função
createTestUser();