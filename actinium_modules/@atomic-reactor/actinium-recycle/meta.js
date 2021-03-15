const pkg = require('./package');
const op = require('object-path');

module.exports = {
    ID: 'Recyle',
    name: 'Recycle Plugin',
    description:
        'Plugin that allows collection data to be recycled before permanent deletion.',
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
        plugin: op.get(pkg, 'version'),
    },
    meta: {
        group: 'core',
        builtIn: true,
    },
};
