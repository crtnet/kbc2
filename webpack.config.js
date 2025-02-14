const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Liste os nomes dos plugins para debugar
  console.log('Plugins antes do filtro:');
  config.plugins.forEach((plugin) => {
    console.log(plugin.constructor && plugin.constructor.name);
  });

  // Remove qualquer instância do WebpackManifestPlugin
  config.plugins = config.plugins.filter((plugin) => {
    const name = plugin.constructor && plugin.constructor.name;
    if (name === 'WebpackManifestPlugin') {
      console.log(`Removendo plugin: ${name}`);
      return false;
    }
    return true;
  });

  return config;
};