const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Remover plugins duplicados do DefinePlugin que conflitam com process.env
  const seenDefinePlugins = new Map();
  config.plugins = config.plugins.filter(plugin => {
    if (plugin instanceof webpack.DefinePlugin) {
      const definitions = plugin.definitions || {};
      if (definitions['process.env']) {
        const key = JSON.stringify(definitions['process.env']);
        if (seenDefinePlugins.has(key)) {
          return false; // remove o plugin duplicado
        } else {
          seenDefinePlugins.set(key, true);
        }
      }
    }
    return true;
  });

  // Caso ainda queira usar JSON com comentários (não recomendado), poderia utilizar json5-loader.
  // Contudo, o ideal é manter os arquivos JSON sem comentários.

  return config;
};