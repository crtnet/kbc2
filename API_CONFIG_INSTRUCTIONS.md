# Resolução do Erro "Unable to resolve '../config/api'"

Este documento explica como resolver o erro "Unable to resolve '../config/api' from 'src/services/bookService.ts'" que ocorre durante o bundling do aplicativo iOS.

## Problema

O erro ocorre porque o arquivo de configuração da API (`api.ts`) não existe no diretório `src/config/`, mas está sendo importado por vários arquivos de serviço.

## Solução

1. Criamos o arquivo `api.ts` no diretório `src/config/` com as configurações necessárias:

```typescript
// src/config/api.ts
import { env } from './env';

// URL base da API
export const API_URL = env.API_URL;

// Timeout padrão para requisições
export const API_TIMEOUT = env.API_TIMEOUT;

// Número de tentativas para requisições que falham
export const RETRY_ATTEMPTS = env.RETRY_ATTEMPTS;

// Tempo de espera entre tentativas (em ms)
export const RETRY_DELAY = env.RETRY_DELAY;

// Headers padrão para requisições
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Endpoints da API
export const API_ENDPOINTS = {
  // Autenticação
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Livros
  BOOKS: {
    LIST: '/books',
    CREATE: '/books',
    GET: (id: string) => `/books/${id}`,
    UPDATE: (id: string) => `/books/${id}`,
    DELETE: (id: string) => `/books/${id}`,
    GET_PDF: (id: string) => `/books/${id}/pdf`,
    UPDATE_COVER_STYLE: (id: string) => `/books/${id}/cover-style`,
    REGENERATE_IMAGE: (id: string) => `/books/${id}/regenerate-image`,
  },
  
  // Avatares
  AVATARS: {
    LIST: '/avatars',
    CATEGORIES: '/avatars/categories',
    STYLES: '/avatars/styles',
    UPLOAD: '/avatars/upload',
  },
};

// Função para construir URLs completas
export const buildUrl = (endpoint: string): string => {
  return `${API_URL}${endpoint}`;
};
```

2. Atualizamos o arquivo `index.ts` no diretório `src/config/` para exportar as configurações da API:

```typescript
// Exporta configurações de ambiente
export * from './env';

// Exporta configurações da API
export * from './api';

// Chaves de armazenamento
export const STORAGE_KEYS = {
  TOKEN: '@KidsBookCreator:token',
  USER: '@KidsBookCreator:user'
};

// Configurações de segurança
export const SECURITY_CONFIG = {
  TOKEN_EXPIRATION_BUFFER: 5 * 60 * 1000, // 5 minutos antes da expiração
};

// Configurações de API
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
};
```

3. Atualizamos o arquivo `auth.service.ts` para usar a nova configuração da API:

```typescript
// Importações atualizadas
import { API_URL, API_ENDPOINTS } from '../config/api';
import { STORAGE_KEYS } from '../config';
import { TOKEN_REFRESH_INTERVAL } from '../config/constants';
```

## Verificação

Após fazer essas alterações, o erro "Unable to resolve '../config/api'" deve ser resolvido. Para verificar:

1. Reinicie o bundler do React Native:
   ```
   npx react-native start --reset-cache
   ```

2. Execute o aplicativo novamente:
   ```
   npx react-native run-ios
   ```

## Observações

- Certifique-se de que o arquivo `.env` ou as variáveis de ambiente estejam configuradas corretamente com a URL da API.
- Se você estiver usando o Expo, verifique se a variável `EXPO_PUBLIC_API_URL` está definida corretamente.
- Se o erro persistir, verifique se há outros arquivos que importam `../config/api` e se eles estão usando as exportações corretas.