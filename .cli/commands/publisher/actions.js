const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const op = require('object-path');
const copy = require('clipboardy');
const inquirer = require('inquirer');
const pkg = require('../../../package');

const normalize = (...p) => path.normalize(path.join(process.cwd(), ...p));

const src = (...p) => normalize('.core', 'plugin', ...p);

const dest = (...p) => normalize('actinium_modules', '@atomic-reactor', ...p);

const jsonColorize = json => {
    return String(json)
        .replace(/\"(.*?)\"(:)/gm, `${chalk.cyan('"$1"')}${chalk.white(':')}`)
        .replace(/\s\"(.*?)\"/gm, ` ${chalk.magenta('"$1"')}`);
};

const pkgTmp = {
    name: '@atomic-reactor/actinium-block',
    version: '1.0.0',
    description: 'Actinium core plugin',
    main: 'index.js',
    scripts: {
        test: 'echo "Error: no test specified" && exit 1',
    },
    keywords: ['actinium', 'core'],
    author: 'Reactium LLC',
    license: 'MIT',
};

let mem = {
    directories: [],
    plugins: [],
};

module.exports = () => ({
    init: () => {
        console.log('');
        console.log(`Publishing ${chalk.magenta('Actinium Core')} plugins...`);
    },
    directories: ({ params }) => {
        mem.plugins = Array.from(params.plugins);
        mem.directories = mem.plugins.map(dir => dest(dir));
    },
    publish: async ({ params }) => {
        const ver = op.get(params, 'ver', 'patch');
        const dirs = Array.from(mem.directories);
        while (dirs.length > 0) {
            const dir = dirs.shift();
            await arcli.runCommand(
                'arcli',
                ['publish', '-p', 'n', '--ver', ver],
                { cwd: dir },
            );
        }
    },
    deps: async ({ action, params, props }) => {
        const deps = mem.plugins.reduce((obj, dir) => {
            const pkgFilePath = dest(dir, 'package.json');
            const { version = 'latest' } = require(pkgFilePath);
            const name = `@atomic-reactor/${dir}`;
            obj[name] = version;
            return obj;
        }, {});

        copy.writeSync(JSON.stringify(deps, null, 2))

        props.message(
            chalk.cyan('Manually update Actinium package.json'),
            '\n\n',
            chalk.magenta('actiniumDependencies:'),
            jsonColorize(JSON.stringify(deps, null, 2)),
            '\n\n',
            '...copied to clipboard!',
        );
    },
});
