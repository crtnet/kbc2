import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/User';
import { config } from '../config';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class AuthController {
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

  public static async verifyToken(req: Request, res: Response): Promise<Response> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1]?.trim();

      if (!token) {
        logger.error('Token não fornecido na verificação');
        return res.status(401).json({ valid: false, error: 'Token não fornecido' });
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await UserModel.findById((decoded as any).id).exec();

      if (!user) {
        logger.error('Usuário não encontrado para o token decodificado');
        return res.status(401).json({ valid: false, error: 'Usuário não encontrado' });
      }

      const tokenExp = (decoded as any).exp * 1000;
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;

      if (tokenExp - now < sixHours) {
        const newToken = this.generateToken(user);
        logger.info('Token renovado');

        return res.status(200).json({
          valid: true,
          token: newToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            type: user.type
          }
        });
      }

      return res.status(200).json({
        valid: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          type: user.type
        }
      });
    } catch (error: any) {
      logger.error(`Erro na verificação do token: ${error.message}`);
      return res.status(401).json({ valid: false, error: 'Token inválido' });
    }
  }

  public static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password, type } = req.body;

      const existingUser = await UserModel.findOne({ email: email.toLowerCase() }).exec();
      if (existingUser) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await UserModel.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        type: type || 'user'
      });

      logger.info(`Usuário registrado: ${email}`);

      return res.status(201).json({
        message: 'Usuário criado com sucesso',
        userId: user._id
      });
    } catch (error: any) {
      logger.error(`Erro no registro: ${error.message}`);
      return res.status(500).json({ error: 'Erro no servidor' });
    }
  }

  public static async login(req: Request, res: Response): Promise<Response> {
    try {
      logger.info('Iniciando processo de login', { body: req.body });

      const { email, password } = req.body;

      // Validações de entrada
      if (!email || !password) {
        logger.warn('Email ou senha não fornecidos');
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        logger.warn('Formato de email inválido', { email });
        return res.status(400).json({ error: 'Formato de email inválido' });
      }

      if (!password || password.length < 6) {
        logger.warn('Senha inválida', { passwordLength: password?.length });
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
      }

      // Verifica se a conexão com o banco está ativa
      if (mongoose.connection.readyState !== 1) {
        logger.error('Conexão com o banco de dados não está ativa', { 
          readyState: mongoose.connection.readyState 
        });
        return res.status(500).json({ error: 'Serviço de banco de dados indisponível' });
      }

      // Busca o usuário com tratamento de erro
      const user = await UserModel.findOne({ email: email.toLowerCase() }).exec();
      
      if (!user) {
        logger.warn(`Tentativa de login com email não cadastrado: ${email}`);
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      // Verifica a senha
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warn(`Tentativa de login com senha incorreta: ${email}`);
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      // Gera o token
      const token = this.generateToken(user);

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
}

export default AuthController;