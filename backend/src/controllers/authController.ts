// src/controllers/AuthController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { config } from '../config';
import { logger } from '../utils/logger';

// Log para depuração: deve imprimir o objeto de configuração
console.log('Config:', config);

export class AuthController {
  public static async verifyToken(req: Request, res: Response): Promise<Response> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1]?.trim();

      if (!token) {
        logger.error('Token não fornecido na verificação');
        return res.status(401).json({ valid: false, error: 'Token não fornecido' });
      }

      logger.info('Verificando token:', token.substring(0, 20) + '...');

      const decoded = jwt.verify(token, config.jwtSecret);
      logger.info('Token decodificado com sucesso:', decoded);

      const user = await UserModel.findById((decoded as any).id, req.db);
      if (!user) {
        logger.error('Usuário não encontrado para o token decodificado');
        return res.status(401).json({ valid: false, error: 'Usuário não encontrado' });
      }

      const tokenExp = (decoded as any).exp * 1000;
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;

      if (tokenExp - now < sixHours) {
        const newToken = jwt.sign(
          { id: user._id },
          config.jwtSecret,
          { expiresIn: '24h' }
        );
        logger.info('Token renovado, novo token gerado');

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

      const existingUser = await UserModel.findOne({ email }, req.db);
      if (existingUser) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await UserModel.create({
        name,
        email,
        password: hashedPassword,
        type
      }, req.db);

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
      const { email, password } = req.body;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email inválido' });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
      }

      const user = await UserModel.findOne({ email }, req.db);
      if (!user) {
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      const rawToken = jwt.sign(
        { id: user._id, email: user.email, type: user.type },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      const token = typeof rawToken === 'string' ? rawToken.trim() : '';
      if (!token) {
        throw new Error('Token inválido retornado pelo servidor');
      }

      logger.info(`Usuário logado: ${email}`);
      logger.info('Token gerado (inicial):', token.substring(0, 20) + '...');

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
      logger.error(`Erro no login: ${error.message}`);
      return res.status(500).json({ error: 'Erro no servidor' });
    }
  }
}

export default AuthController;