/**
 * Use liberally for additional core configuration.
 * @type {Object}
 */
import fs from 'node:fs';
import path from 'node:path';
import { dirname } from '@atomic-reactor/dirname';

const pkg = JSON.parse(
    fs.readFileSync(path.join(dirname(import.meta.url), 'package.json')),
);

export default {
    version: pkg.version,
    semver: '^5.1.0',
    update: {
        package: {
            dependencies: {
                add: {},
                remove: [],
            },
            devDependencies: {
                add: {},
                remove: [],
            },
            scripts: {
                add: {},
                remove: [],
            },
            actiniumDependencies: {
                add: {},
                remove: [],
            },
        },
        files: {
            add: [
                {
                    overwrite: true,
                    version: '>=3.0.1',
                    destination: '/src/index.js',
                    source: '/tmp/update/src/index.js',
                },
                {
                    overwrite: true,
                    force: true,
                    version: '>=3.5.5',
                    destination: '/.npmrc',
                    source: '/tmp/update/.npmrc',
                },
                {
                    overwrite: true,
                    force: true,
                    version: '>=3.6.1',
                    destination: '/nodemon.json',
                    source: '/tmp/update/nodemon.json',
                },
                {
                    overwrite: true,
                    force: true,
                    version: '3.6.4',
                    destination: '/.gitignore',
                    source: '/tmp/update/.gitignore',
                },
                {
                    overwrite: true,
                    version: '>=3.6.6',
                    destination: '/Dockerfile',
                    source: '/tmp/update/Dockerfile',
                },
                {
                    overwrite: true,
                    version: '>=3.6.6',
                    destination: '/.dockerignore',
                    source: '/tmp/update/.dockerignore',
                },
            ],
            remove: [],
        },
    },
};
