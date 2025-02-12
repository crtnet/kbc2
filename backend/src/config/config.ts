export default {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: '7d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kids-book-creator',
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:19006',
};