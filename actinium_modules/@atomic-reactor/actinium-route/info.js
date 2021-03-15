const pkg = require('./package');
const op = require('object-path');

module.exports = {
    ID: 'Route',
    description: 'Plugin responsible for managing front-end dynamic routing.',
    name: 'Route Plugin',
    order: 100,
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
        plugin: op.get(pkg, 'version'),
    },
    bundle: [],
    meta: {
        builtIn: true,
    },
};
