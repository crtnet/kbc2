import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth.types';
import { config } from '../config/config';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class AuthController {
  async register(req: Request<{}, {}, RegisterRequest>, res: Response) {
    try {
      const { email, password, name } = req.body;

      // Verifica se o usuário já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      // Cria o hash da senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Cria o usuário
      const user = new User({
        email,
        password: hashedPassword,
        name,
        type: 'user'
      });

      await user.save();

      // Gera o token
      const token = jwt.sign(
        { id: user.id, email: user.email, type: user.type },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const response: AuthResponse = {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          type: user.type
        }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  }

  async login(req: Request<{}, {}, LoginRequest>, res: Response) {
    try {
      const { email, password } = req.body;
      logger.info('Tentativa de login', { email });

      // Busca o usuário
      const user = await User.findByEmail(email);
      if (!user) {
        logger.warn('Login falhou: usuário não encontrado', { email });
        return res.status(401).json({ 
          error: 'Credenciais inválidas',
          message: 'Usuário não encontrado. Verifique seu email ou registre-se.'
        });
      }

      // Verifica a senha
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        logger.warn('Login falhou: senha inválida', { email });
        return res.status(401).json({ 
          error: 'Credenciais inválidas',
          message: 'Senha incorreta. Verifique sua senha e tente novamente.'
        });
      }

      // Gera o token
      const token = jwt.sign(
        { id: user.id, email: user.email, type: user.type },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const response: AuthResponse = {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          type: user.type
        }
      };

      logger.info('Login bem-sucedido', { userId: user.id });
      res.json(response);
    } catch (error) {
      logger.error('Erro ao fazer login:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      const user = await User.findById(req.user?.id).select('-password');
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      res.json(user);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { name, email } = req.body;
      const userId = req.user?.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({ error: 'Email já está em uso' });
        }
      }

      user.name = name || user.name;
      user.email = email || user.email;

      await user.save();

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.type
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      await user.remove();
      res.json({ message: 'Usuário removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      res.status(500).json({ error: 'Erro ao remover usuário' });
    }
  }

  public static async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      // Tenta obter o token do body ou do header Authorization
      let token = req.body.token;
      if (!token) {
        const authHeader = req.headers.authorization;
        token = authHeader ? authHeader.split(' ')[1] : null;
      }
      
      if (!token) {
        logger.warn('Token não fornecido para refresh');
        return res.status(400).json({ error: 'Token é obrigatório' });
      }

      try {
        // Verifica se o token atual ainda é válido
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        
        // Busca o usuário no banco
        const user = await User.findById(decoded.id);
        
        if (!user) {
          logger.warn('Usuário não encontrado durante refresh do token', { userId: decoded.id });
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Gera um novo token
        const newToken = jwt.sign(
          { id: user.id, email: user.email, type: user.type },
          config.jwt.secret,
          { expiresIn: config.jwt.expiresIn }
        );

        logger.info('Token refreshed com sucesso', { userId: user._id });

        return res.status(200).json({
          token: newToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            type: user.type
          }
        });
      } catch (jwtError: any) {
        logger.warn('Token inválido durante refresh', { error: jwtError.message });
        return res.status(401).json({ error: 'Token inválido' });
      }
    } catch (error: any) {
      logger.error(`Erro no refresh do token: ${error.message}`, {
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({ 
        error: 'Erro no servidor',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }

  public static async verifyToken(req: Request, res: Response): Promise<Response> {
    try {
      // O token já foi verificado pelo middleware de autenticação
      // Se chegou aqui, o token é válido
      const user = req.user;

      logger.info('Token verificado com sucesso', { userId: user!.id });

      return res.status(200).json({
        valid: true,
        user: {
          id: user!.id,
          email: user!.email,
          type: user!.type
        }
      });
    } catch (error: any) {
      logger.error(`Erro na verificação do token: ${error.message}`, {
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({ 
        error: 'Erro no servidor',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }
}

export default AuthController;