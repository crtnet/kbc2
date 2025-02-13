// frontend/webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Modifica a regra do babel-loader para que não exclua react-native-svg,
  // ou seja, force sua transpilação mesmo estando em node_modules.
  config.module.rules = config.module.rules.map(rule => {
    if (rule.test && rule.test.toString().includes('js')) {
      // Altere a propriedade "exclude" para excluir todos os módulos de node_modules,
      // exceto react-native-svg.
      rule.exclude = /node_modules\/(?!react-native-svg)/;
    }
    return rule;
  });

  return config;
};
