import fs from 'node:fs';
import op from 'object-path';

const pkg = JSON.parse(fs.readFileSync('package.json'));

export default {
    ID: 'Route',
    description: 'Plugin responsible for managing front-end dynamic routing.',
    name: 'Route Plugin',
    order: 100,
    version: {
        actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
        plugin: op.get(pkg, 'version'),
    },
    bundle: [],
    meta: {
        builtIn: true,
    },
};
