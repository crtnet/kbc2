import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { config } from '../config';
import { logger } from '../utils/logger';

export class AuthController {
  public static async verifyToken(req: Request, res: Response): Promise<Response> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          valid: false, 
          error: 'Token não fornecido' 
        });
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ 
          valid: false, 
          error: 'Usuário não encontrado' 
        });
      }

      // Renovar token se estiver próximo de expirar
      const tokenExp = (decoded as any).exp * 1000;
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;

      if (tokenExp - now < sixHours) {
        const newToken = jwt.sign(
          { id: user._id },
          config.jwtSecret,
          { expiresIn: '24h' }
        );

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
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          type: user.type
        }
      });
    } catch (error) {
      logger.error(`Erro na verificação do token: ${error.message}`);
      return res.status(401).json({ 
        valid: false, 
        error: 'Token inválido' 
      });
    }
  }
  public static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password, type } = req.body;

      // Verificar se usuário já existe
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      // Criptografar senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Criar novo usuário
      const user = new User({
        name,
        email,
        password: hashedPassword,
        type
      });

      await user.save();

      logger.info(`Usuário registrado: ${email}`);

      return res.status(201).json({ 
        message: 'Usuário criado com sucesso',
        userId: user._id 
      });
    } catch (error) {
      logger.error(`Erro no registro: ${error.message}`);
      return res.status(500).json({ error: 'Erro no servidor' });
    }
  }

  public static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email inválido' });
      }

      // Validar senha
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
      }

      // Verificar se usuário existe
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      // Verificar senha
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: user._id,
          email: user.email,
          type: user.type
        }, 
        config.jwtSecret, 
        { expiresIn: '24h' }
      );

      logger.info(`Usuário logado: ${email}`);

      return res.status(200).json({ 
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          type: user.type
        }
      });
    } catch (error) {
      logger.error(`Erro no login: ${error.message}`);
      return res.status(500).json({ error: 'Erro no servidor' });
    }
  }
}

export default AuthController;