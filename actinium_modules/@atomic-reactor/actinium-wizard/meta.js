const pkg = require('./package');
const op = require('object-path');

module.exports = {
    ID: 'Wizard',
    COLLECTION: 'Wizard',
    description: 'Plugin for creating guided walk-throughs.',
    name: 'Wizard Plugin',
    order: 100,
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
        plugin: op.get(pkg, 'version'),
    },
    bundle: [],
    meta: {
        group: 'Editing',
        builtIn: true,
    },
};
