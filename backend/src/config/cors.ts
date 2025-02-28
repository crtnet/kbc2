export const corsOptions = {
    origin: [
      'http://localhost:19006',
      'http://localhost:8081',
      'http://localhost:3000',
      'http://localhost:*',  // Permite qualquer porta local
      process.env.FRONTEND_URL // Permite URL configurada no ambiente
    ].filter(Boolean), // Remove valores undefined/null
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
  };