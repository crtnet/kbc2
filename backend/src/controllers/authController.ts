import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, type } = req.body;

    console.log('Received registration request:', { name, email, type });

    // Validação básica
    if (!name || !email || !password || !type) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Validar tipo de usuário
    const validTypes = ['parent', 'child'];
    if (!validTypes.includes(type)) {
      console.log('Invalid user type:', type);
      return res.status(400).json({ message: 'Tipo de usuário inválido' });
    }

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Criar usuário
    const user = new User({
      name,
      email,
      password: hashedPassword,
      type
    });

    await user.save();
    console.log('User created successfully:', user._id);

    // Gerar token
    const token = jwt.sign(
      { id: user._id, type: user.type },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type
      },
      token
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ message: 'Erro ao criar conta' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email ou senha inválidos' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Email ou senha inválidos' });
    }

    // Gerar token
    const token = jwt.sign(
      { id: user._id, type: user.type },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type
      },
      token
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
};