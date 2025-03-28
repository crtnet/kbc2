// src/services/mockAuthService.ts
import { logger } from '../utils/logger';

// Interface para usuário mockado
interface MockUser {
  id: string;
  email: string;
  name: string;
  type: string;
}

// Usuários mockados para desenvolvimento
const MOCK_USERS: Record<string, { user: MockUser; password: string }> = {
  'admin@example.com': {
    user: {
      id: 'mock-admin-id',
      email: 'admin@example.com',
      name: 'Admin User',
      type: 'admin'
    },
    password: 'password123'
  },
  'user@example.com': {
    user: {
      id: 'mock-user-id',
      email: 'user@example.com',
      name: 'Test User',
      type: 'user'
    },
    password: 'password123'
  },
  'crtnet@hotmail.com': {
    user: {
      id: 'mock-crtnet-id',
      email: 'crtnet@hotmail.com',
      name: 'CRT User',
      type: 'user'
    },
    password: 'abencoado'
  }
};

/**
 * Serviço de autenticação mockado para desenvolvimento
 * Usado quando o servidor real não está disponível
 */
export const mockAuthService = {
  /**
   * Simula o login de um usuário
   * @param email Email do usuário
   * @param password Senha do usuário
   * @returns Promise com os dados do usuário e token
   */
  login: async (email: string, password: string): Promise<{ token: string; user: MockUser }> => {
    logger.info('Usando serviço de autenticação mockado', { email });
    
    // Simula um atraso de rede
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Verifica se o usuário existe
    const userRecord = MOCK_USERS[email.toLowerCase()];
    if (!userRecord) {
      logger.warn('Login mockado falhou: usuário não encontrado', { email });
      throw new Error('Credenciais inválidas');
    }
    
    // Verifica a senha
    if (userRecord.password !== password) {
      logger.warn('Login mockado falhou: senha incorreta', { email });
      throw new Error('Credenciais inválidas');
    }
    
    // Gera um token mockado
    const token = `mock-token-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    logger.info('Login mockado bem-sucedido', { email });
    return {
      token,
      user: userRecord.user
    };
  },
  
  /**
   * Simula o registro de um novo usuário
   * @param email Email do usuário
   * @param password Senha do usuário
   * @param name Nome do usuário
   * @returns Promise com os dados do usuário e token
   */
  register: async (email: string, password: string, name: string): Promise<{ token: string; user: MockUser }> => {
    logger.info('Usando serviço de registro mockado', { email });
    
    // Simula um atraso de rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verifica se o usuário já existe
    if (MOCK_USERS[email.toLowerCase()]) {
      logger.warn('Registro mockado falhou: usuário já existe', { email });
      throw new Error('Este email já está em uso');
    }
    
    // Cria um novo usuário mockado
    const newUser: MockUser = {
      id: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      type: 'user'
    };
    
    // Adiciona o usuário à lista de usuários mockados (apenas em memória)
    MOCK_USERS[email.toLowerCase()] = {
      user: newUser,
      password
    };
    
    // Gera um token mockado
    const token = `mock-token-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    logger.info('Registro mockado bem-sucedido', { email, userId: newUser.id });
    return {
      token,
      user: newUser
    };
  },
  
  /**
   * Verifica se um token é válido
   * @returns Promise com status de validade
   */
  verifyToken: async (): Promise<{ valid: boolean; user?: MockUser }> => {
    // Simula um atraso de rede
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // No modo mockado, sempre considera o token válido
    return {
      valid: true,
      user: {
        id: 'mock-session-id',
        email: 'session@example.com',
        name: 'Session User',
        type: 'user'
      }
    };
  }
};