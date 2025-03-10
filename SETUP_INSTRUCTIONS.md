# Instruções de Configuração

Este documento contém instruções para configurar e resolver problemas comuns no aplicativo de criação de livros infantis personalizados.

## Resolvendo o Erro "Cannot find module '../middleware/authMiddleware'"

Se você encontrar o erro `Cannot find module '../middleware/authMiddleware'`, siga estas etapas:

1. Verifique se o arquivo `authMiddleware.ts` existe na pasta `backend/src/middleware/`
2. Se não existir, crie o arquivo com o seguinte conteúdo:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { config } from '../config/config';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        type: string;
        name?: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Middleware de autenticação - Headers recebidos:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      headers: Object.keys(req.headers)
    });

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.error('Token não fornecido');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      logger.info('Token decodificado com sucesso:', { decoded });

      if (typeof decoded === 'string') {
        throw new Error('Token inválido');
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
        type: decoded.type,
        name: decoded.name
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.error('Token expirado');
        return res.status(401).json({ error: 'Token expirado' });
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        logger.error('Token inválido:', error.message);
        return res.status(401).json({ error: 'Token inválido' });
      }

      logger.error('Erro na verificação do token:', error);
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};
```

## Instalando Dependências Necessárias

Algumas dependências podem estar faltando no projeto. Execute o script de instalação para garantir que todas as dependências estejam instaladas:

```bash
# Dê permissão de execução ao script
chmod +x install-dependencies.sh

# Execute o script
./install-dependencies.sh
```

Ou instale manualmente:

```bash
cd backend
npm install multer
npm install @types/multer --save-dev
```

## Estrutura de Diretórios para Avatares

O sistema de avatares requer uma estrutura específica de diretórios. Certifique-se de que os seguintes diretórios existam:

```
backend/public/assets/avatars/
├── children/
│   └── cartoon/
├── adults/
│   └── cartoon/
├── animals/
│   └── cartoon/
├── fantasy/
│   └── cartoon/
├── uploads/
└── processed/
```

Você pode criar esses diretórios manualmente ou usar os seguintes comandos:

```bash
mkdir -p backend/public/assets/avatars/children/cartoon
mkdir -p backend/public/assets/avatars/adults/cartoon
mkdir -p backend/public/assets/avatars/animals/cartoon
mkdir -p backend/public/assets/avatars/fantasy/cartoon
mkdir -p backend/public/assets/avatars/uploads
mkdir -p backend/public/assets/avatars/processed
```

## Configuração do Ambiente

Certifique-se de que o arquivo `.env` na pasta `backend` contenha as seguintes variáveis:

```
JWT_SECRET=seu_segredo_jwt
MONGODB_URI=sua_uri_mongodb
AVATAR_SERVER_URL=http://localhost:3000
```

## Executando o Projeto

Para executar o projeto, use os seguintes comandos:

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm start
```

## Solução de Problemas Comuns

### Erro de CORS
Se você encontrar erros de CORS, verifique se a configuração de CORS no backend está correta e se a URL do frontend está na lista de origens permitidas.

### Erro de Conexão com o MongoDB
Verifique se a URI do MongoDB está correta e se o servidor MongoDB está em execução.

### Erro de Upload de Imagens
Verifique se os diretórios de upload e processamento existem e têm permissões de escrita.