const copy = require('clipboardy');

const { chalk, fs, op, path } = arcli;

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

const PROMPT = (props, params) =>
    props.inquirer.prompt(
        [
            {
                default: '>=3.7.0',
                name: 'ver',
                type: 'input',
                prefix: props.prefix,
                message: 'Actinium Version:',
            },
        ],
        params,
    );

const ACTION = async ({ opt, props }) => {
    console.log('');
    let params = FLAGS_TO_PARAMS({ opt, props });

    props.prefix = chalk.cyan(props.config.prompt.prefix);

    const { ver = '>=3.7.0' } = await PROMPT(props, params);

    const deps = plugins().reduce((obj, dir) => {
        const pkgFilePath = dest(dir, 'package.json');
        if (!fs.existsSync(pkgFilePath)) return obj;

        const pkg = require(pkgFilePath);

        const { version = 'latest' } = pkg;

        const name = `@atomic-reactor/${dir}`;
        obj[name] = version;

        op.set(pkg, 'actinium.version', ver);
        fs.writeFileSync(pkgFilePath, JSON.stringify(pkg, null, 2));

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

const FLAGS = {
    ver: {
        flag: '--ver [ver]',
        desc: 'Actinium version',
    },
};

const FLAGS_TO_PARAMS = ({ opt = {}, props }) =>
    Object.keys(FLAGS).reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            switch (key) {
                default:
                    obj[key] = val;
            }
        }

        return obj;
    }, {});

const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .option(FLAGS.ver.flag, FLAGS.ver.desc)
        .on('--help', HELP);

module.exports = {
    COMMAND,
    NAME,
};
