// src/config/index.ts

// Configurações do ambiente
const ENV = {
  development: {
    apiUrl: 'http://localhost:3000',
    enableLogs: true,
    socketEnabled: true,
  },
  production: {
    apiUrl: 'https://api.kidsbook.example.com', // Substitua pelo URL de produção real
    enableLogs: false,
    socketEnabled: true,
  },
  test: {
    apiUrl: 'http://localhost:3000',
    enableLogs: false,
    socketEnabled: false,
  },
};

// Determina o ambiente atual
const getEnvironment = () => {
  // Para React Native/Expo
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }
  return 'development';
};

// Detecta se estamos rodando em um emulador ou dispositivo físico
const isRunningOnDevice = () => {
  if (typeof window !== 'undefined' && window.location) {
    // Web - verifica se estamos em localhost
    return window.location.hostname !== 'localhost';
  }
  return false;
};

// Ajusta a URL da API para funcionar em emuladores
const getApiUrl = () => {
  const env = getEnvironment();
  let apiUrl = ENV[env as keyof typeof ENV].apiUrl;
  
  // Se estiver rodando em um emulador Android, usa 10.0.2.2 em vez de localhost
  if (env === 'development' && isRunningOnDevice()) {
    apiUrl = apiUrl.replace('localhost', '10.0.2.2');
  }
  
  return apiUrl;
};

const currentEnv = getEnvironment();

// Exporta a configuração do ambiente atual
export const config = {
  ...ENV[currentEnv as keyof typeof ENV],
  apiUrl: getApiUrl(),
  env: currentEnv,
  appName: 'Kids Book Creator',
  appVersion: '1.0.0',
  
  // Configurações de autenticação
  auth: {
    tokenKey: 'auth_token',
    userKey: 'user_data',
    expiryKey: 'token_expiry',
  },
  
  // Configurações de cache
  cache: {
    imageExpiry: 7 * 24 * 60 * 60 * 1000, // 7 dias em milissegundos
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  
  // Configurações de upload
  upload: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
    defaultQuality: 0.8,
  },
  
  // Configurações de timeout para requisições
  timeouts: {
    default: 30000, // 30 segundos
    upload: 60000, // 60 segundos para uploads
  },
  
  // Configurações de Socket.IO
  socket: {
    enabled: ENV[currentEnv as keyof typeof ENV].socketEnabled,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    timeout: 10000,
  },
};