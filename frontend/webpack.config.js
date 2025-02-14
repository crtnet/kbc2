const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        // Configurações personalizadas do Babel
        configFile: path.resolve(__dirname, 'babel.config.js'),
      },
    },
    argv
  );
  
  // Customizar o config antes de retornar
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web'
  };

  // Adicionar suporte a extensões de arquivo
  config.resolve.extensions.push('.ts', '.tsx', '.web.js', '.web.ts', '.web.tsx');

  // Configurar módulos
  config.resolve.modules = [
    path.resolve(__dirname, 'src'),
    'node_modules'
  ];

  // Adicionar plugin de variáveis de ambiente
  config.plugins.push(
    new Dotenv({
      path: path.resolve(__dirname, '.env'),
      safe: true,
      systemvars: true
    }),
    // Resolver conflitos de variáveis de ambiente
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env)
    })
  );

  // Configurações de desenvolvimento
  if (env.mode === 'development') {
    config.devServer = {
      ...config.devServer,
      // Desativar avisos de depreciação
      client: {
        overlay: {
          warnings: false,
          errors: true
        }
      }
    };
  }

  return config;
};