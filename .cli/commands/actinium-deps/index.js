const copy = require('clipboardy');

const { chalk, fs, path } = arcli;

const NAME = 'deps';
const X = chalk.red('✖');
const CHK = chalk.green('✓');
const DESC = 'Get Actinium actiniumDependencies object';

const exit = (...msg) => {
    console.log('');
    console.log(...msg);
    console.log('');
    process.exit();
};

const dest = (...p) =>
    path.normalize(
        path.join(process.cwd(), 'actinium_modules', '@atomic-reactor', ...p),
    );

const jsonColorize = json =>
    String(JSON.stringify(json, null, 2))
        .replace(/\"(.*?)\"(:)/gm, `${chalk.cyan('"$1"')}${chalk.white(':')}`)
        .replace(/\s\"(.*?)\"/gm, ` ${chalk.magenta('"$1"')}`);

const plugins = () => fs.readdirSync(dest());

// prettier-ignore
const HELP = () => console.log(`
Example:
  $ ${chalk.white('arcli')} ${chalk.magenta(NAME)}
`);

const ACTION = () => {
    const deps = plugins().reduce((obj, dir) => {
        const pkgFilePath = dest(dir, 'package.json');
        const { version = 'latest' } = require(pkgFilePath);
        const name = `@atomic-reactor/${dir}`;
        obj[name] = version;
        return obj;
    }, {});

    copy.writeSync(JSON.stringify(deps, null, 2));

    exit(
        chalk.cyan('Manually update Actinium package.json'),
        '\n\n',
        chalk.magenta('actiniumDependencies:'),
        jsonColorize(deps),
        '\n\n',
        CHK,
        'copied to clipboard!',
    );
};

const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .on('--help', HELP);

module.exports = {
    COMMAND,
    NAME,
};
