import fs from 'node:fs';
import op from 'object-path';

const pkg = JSON.parse(fs.readFileSync('package.json'));

export default {
    ID: 'Recyle',
    name: 'Recycle Plugin',
    description:
        'Plugin that allows collection data to be recycled before permanent deletion.',
    version: {
        actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
        plugin: op.get(pkg, 'version'),
    },
    meta: {
        group: 'core',
        builtIn: true,
    },
};
