const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Adiciona suporte a arquivos JSON
  config.module.rules.push({
    test: /\.json$/,
    loader: 'json-loader',
    type: 'javascript/auto'
  });

  return config;
};