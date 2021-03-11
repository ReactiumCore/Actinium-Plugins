const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const pkg = require('../package');
const op = require('object-path');
const inquirer = require('inquirer');
const copy = require('node-clipboard');

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

const pluginUpdate = async () => {
    const move = fs.readdirSync(src()).map(dir => ({
        dir,
        source: src(dir),
        name: `actinium-${dir}`,
        destination: dest(`actinium-${dir}`),
    }));

    if (move.length > 0) {
        console.log(chalk.magenta('Moving core plugins...'));
        console.log('');
    }

    move.forEach(({ source, destination, dir }) => {
        fs.moveSync(source, destination, { overwrite: true });
        console.log(
            '  ',
            chalk.cyan.bold(dir),
            chalk.blue('➔'),
            chalk.magenta(String(destination).replace(process.cwd())),
        );
    });

    if (!op.get(pkg, 'actiniumDependencies')) {
        pkg.actiniumDependencies = {};
    }

    let deps = {};

    fs.readdirSync(dest()).forEach(dir => {
        const name = `@atomic-reactor/${dir}`;
        const pkgFilePath = dest(dir, 'package.json');

        let version = 'latest';

        if (fs.existsSync(pkgFilePath)) {
            const { version: ver } = require(pkgFilePath);
            version = ver;
        } else {
            const pluginPkg = { ...pkgTmp, name };
            fs.writeFileSync(pkgFilePath, JSON.stringify(pluginPkg, null, 2));
        }

        op.set(deps, name, version);

        // prettier-ignore
        op.set(pkg, `scripts.publish:${dir}`, `cd ${dest(dir).replace(process.cwd(), '.')} && arcli publish && cd $INIT_CWD`);
    });

    const prefix = chalk.magenta('   > ');
    const suffix = chalk.magenta(': ');

    const { update } = await inquirer.prompt([
        {
            prefix,
            suffix,
            default: false,
            name: 'update',
            type: 'confirm',
            message: 'Update package.json',
        },
    ]);

    if (update !== true) {
        console.log('');
        console.log(chalk.magenta('Manually update actiniumDependencies:'));
        console.log('');
        console.log(jsonColorize(JSON.stringify(deps, null, 2)));
        console.log('');
        console.log('...copied to clipboard!');
    } else {
        pkg.actiniumDependencies = deps;
    }

    fs.writeFileSync(normalize('package.json'), JSON.stringify(pkg, null, 2));

    copy(JSON.stringify(deps, null, 2));
    console.log('');
};

pluginUpdate();
