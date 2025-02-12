import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

// Verifica se as variáveis de ambiente obrigatórias estão definidas
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export const config = {
  port: process.env.PORT || 3000,
  mongodb: {
    uri: process.env.MONGODB_URI as string
  },
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: '1d'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  }
};