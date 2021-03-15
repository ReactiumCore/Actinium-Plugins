const pkg = require('./package');
const op = require('object-path');

module.exports = {
    ID: 'Taxonomy',
    description: '',
    name: 'Taxonomy Plugin',
    order: 100,
    bundle: [],
    meta: {
        group: 'Editing',
        builtIn: true,
    },
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
        plugin: op.get(pkg, 'version'),
    },
};
