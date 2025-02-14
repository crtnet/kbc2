const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adicionar suporte a resolução de módulos
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs'];
config.resolver.assetExts = [...config.resolver.assetExts, 'env'];

// Configuração de resolução de módulos
config.resolver.resolverMainFields = [
  'react-native',
  'browser',
  'module',
  'main'
];

module.exports = config;