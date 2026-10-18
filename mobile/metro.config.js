// Lets Metro bundle ../design and ../shared (outside mobile/). The @design/* and
// @shared/* aliases come from tsconfig.json "paths", which Expo's Metro reads.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [repoRoot];
// Packages always come from mobile/node_modules, even for files in design/ or shared/.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
