import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/User';
import { config } from '../config';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<Response> {
    try {
      logger.info('Iniciando processo de registro', { body: req.body });

      const { name, email, password, type } = req.body;

      // Validações básicas
      if (!name || !email || !password) {
        logger.warn('Dados incompletos para registro');
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        logger.warn('Formato de email inválido', { email });
        return res.status(400).json({ error: 'Formato de email inválido' });
      }

      if (password.length < 6) {
        logger.warn('Senha muito curta');
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
      }

      // Verifica se o email já está em uso
      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        logger.warn('Tentativa de registro com email já existente', { email });
        return res.status(400).json({ error: 'Email já está em uso' });
      }

      // Hash da senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Cria o novo usuário
      const user = new UserModel({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        type: type || 'user'
      });

      await user.save();

      const token = AuthController.generateToken(user);

      logger.info('Novo usuário registrado com sucesso', { 
        userId: user._id,
        email: user.email 
      });

      return res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          type: user.type
        }
      });
    } catch (error: any) {
      logger.error(`Erro no registro: ${error.message}`, {
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({ 
        error: 'Erro no servidor',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }

  public static generateToken(user: IUser): string {
    const payload = {
      id: user._id,
      email: user.email,
      type: user.type
    };

    return jwt.sign(payload, config.jwtSecret, { 
      expiresIn: config.jwtExpiresIn || '24h' 
    });
  }

  public static async login(req: Request, res: Response): Promise<Response> {
    try {
      logger.info('Iniciando processo de login', { body: req.body });

      const { email, password } = req.body;

      if (!email || !password) {
        logger.warn('Email ou senha não fornecidos');
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        logger.warn('Formato de email inválido', { email });
        return res.status(400).json({ error: 'Formato de email inválido' });
      }

      if (password.length < 6) {
        logger.warn('Senha inválida', { passwordLength: password.length });
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
      }

      if (mongoose.connection.readyState !== 1) {
        logger.error('Conexão com o banco de dados não está ativa', { 
          readyState: mongoose.connection.readyState 
        });
        return res.status(500).json({ error: 'Serviço de banco de dados indisponível' });
      }

      const user = await UserModel.findOne({ email: email.toLowerCase() }).exec();
      
      if (!user) {
        logger.warn(`Tentativa de login com email não cadastrado: ${email}`);
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warn(`Tentativa de login com senha incorreta: ${email}`);
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      const token = AuthController.generateToken(user);

      logger.info(`Usuário logado: ${email}`, { 
        userId: user._id,
        tokenGenerated: !!token 
      });

      return res.status(200).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          type: user.type
        }
      });
    } catch (error: any) {
      logger.error(`Erro no login: ${error.message}`, {
        stack: error.stack,
        name: error.name,
        errorType: typeof error
      });
      return res.status(500).json({ 
        error: 'Erro no servidor', 
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined 
      });
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
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        
        // Busca o usuário no banco
        const user = await UserModel.findById(decoded.id);
        
        if (!user) {
          logger.warn('Usuário não encontrado durante refresh do token', { userId: decoded.id });
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Gera um novo token
        const newToken = AuthController.generateToken(user);

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