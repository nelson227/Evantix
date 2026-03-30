const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch monorepo root for shared packages
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both mobile and root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// CRITICAL: Force a single copy of react for the entire bundle.
// In a monorepo, multiple copies cause "Invalid hook call" errors.
const singletonPackages = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(monorepoRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(monorepoRoot, 'node_modules/react/jsx-dev-runtime'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletonPackages[moduleName]) {
    return {
      filePath: require.resolve(moduleName, { paths: [monorepoRoot] }),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
