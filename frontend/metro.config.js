const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Remove any svg specific configuration for now
module.exports = config;