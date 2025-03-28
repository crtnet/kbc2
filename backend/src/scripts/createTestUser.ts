// Script para criar um usuário de teste
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { logger } from '../utils/logger';

// Carrega as variáveis de ambiente
dotenv.config();

async function createTestUser() {
  try {
    // Conecta ao banco de dados
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kbc2';
    logger.info(`Conectando ao banco de dados: ${uri}`);
    
    await mongoose.connect(uri);
    logger.info('Conectado ao banco de dados');

    // Dados do usuário de teste
    const testUser = {
      email: 'crtnet@hotmail.com',
      password: 'senha123',
      name: 'Usuário de Teste',
      type: 'user'
    };

    // Verifica se o usuário já existe
    const existingUser = await User.findOne({ email: testUser.email });
    if (existingUser) {
      logger.info('Usuário de teste já existe', { userId: existingUser.id });
      await mongoose.disconnect();
      return;
    }

    // Cria o hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testUser.password, salt);

    // Cria o usuário
    const user = new User({
      email: testUser.email,
      password: hashedPassword,
      name: testUser.name,
      type: testUser.type
    });

    await user.save();
    logger.info('Usuário de teste criado com sucesso', { userId: user.id });

    // Desconecta do banco de dados
    await mongoose.disconnect();
    logger.info('Desconectado do banco de dados');
  } catch (error) {
    logger.error('Erro ao criar usuário de teste', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Executa a função
createTestUser();

// Executa a função
createTestUser();