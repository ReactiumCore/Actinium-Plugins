import op from 'object-path';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json'));

export default {
    ID: 'Taxonomy',
    description: 'Plugin for managing Content Type taxonomies.',
    name: 'Taxonomy Plugin',
    order: 100,
    bundle: [],
    meta: {
        group: 'Editing',
    },
    version: {
        actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
        plugin: op.get(pkg, 'version'),
    },
};
