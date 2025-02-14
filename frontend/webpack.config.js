const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  // Obtém a configuração padrão do Expo para Webpack
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Filtra os plugins para remover plugins duplicados do DefinePlugin que possam conflitar com process.env
  const seenDefinePlugins = new Map();
  config.plugins = config.plugins.filter(plugin => {
    if (plugin instanceof webpack.DefinePlugin) {
      // Extrai as definições do plugin ou usa um objeto vazio caso não exista
      const definitions = plugin.definitions || {};
      if (definitions['process.env']) {
        // Converte as definições de process.env em string para comparação
        const key = JSON.stringify(definitions['process.env']);
        if (seenDefinePlugins.has(key)) {
          // Se já existe um plugin com as mesmas definições, descarta o plugin duplicado
          console.warn('[webpack.config.js] Removendo DefinePlugin duplicado:', key);
          return false;
        } else {
          seenDefinePlugins.set(key, true);
        }
      }
    }
    return true;
  });

  // Caso necessário, você pode adicionar outros ajustes ou plugins personalizados aqui.
  // Exemplo: Habilitar algum plugin específico apenas para o ambiente de desenvolvimento:
  // if (env.mode === 'development') {
  //   config.plugins.push(new webpack.HotModuleReplacementPlugin());
  // }

  // Retorna a configuração final
  return config;
};