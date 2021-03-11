const chalk = require('chalk');
const actions = require('./actions');
const ActionSequence = require('action-sequence');

const message = (...msg) => {
    console.log('');
    console.log(...msg);
    console.log('');
};

const error = (...err) => message(chalk.red('Error:'), ...err);

const exit = (...msg) => {
    message(...msg);
    process.exit();
};

const NAME = 'publisher';

const DESC = 'Publish all actinium-core plugins';

// prettier-ignore
const CANCELED = ` ${chalk.red('✖')} ${chalk.magenta(NAME)} ${chalk.cyan('canceled!')}`;

const PROMPT = {
    CONFIRM: async (props, params) => {
        const { confirm } = await props.inquirer.prompt(
            [
                {
                    default: false,
                    name: 'confirm',
                    type: 'confirm',
                    prefix: props.prefix,
                    message: 'Proceed?:',
                },
            ],
            params,
        );

        params.confirm = confirm;
    },
    UPDATE: async (props, params) => {
        const { update } = await props.inquirer.prompt(
            [
                {
                    default: false,
                    name: 'update',
                    type: 'confirm',
                    prefix: props.prefix,
                    message: 'Update package.json scripts?:',
                },
            ],
            params,
        );

        params.update = update;
    },
};

const CONFORM = ({ input, props }) =>
    Object.keys(input).reduce((obj, key) => {
        let val = input[key];
        switch (key) {
            default:
                obj[key] = val;
                break;
        }
        return obj;
    }, {});

// prettier-ignore
const HELP = () => console.log(`
Example:
  $ arcli publish-all -h
`);

const PREFLIGHT = ({ msg, params, props }) => {
    msg = msg || 'Preflight checklist:';

    message(msg);

    // Transform the preflight object instead of the params object
    const preflight = { ...params };

    console.log(JSON.stringify(preflight, null, 2));
};

const ACTION = async ({ opt, props }) => {
    console.log('');

    props.error = error;
    props.message = message;
    props.prefix = chalk.cyan(props.config.prompt.prefix);

    let params = FLAGS_TO_PARAMS({ opt });

    await PROMPT.UPDATE(props, params);

    await PROMPT.CONFIRM(props, params);

    if (!params.confirm) exit(CANCELED);

    const [errors, success] = await ActionSequence({
        actions: actions(),
        options: { params, props },
    })
        .then(success => [null, success])
        .catch(error => [error]);

    if (!success) {
        error(errors);
    } else {
        message(chalk.green('✓'), chalk.magenta(name), 'complete!');
    }

    process.exit();
};

const FLAGS = {
    update: {
        flag: '-u, --update [update]',
        desc: 'Update package.json scripts',
    },
};

const FLAGS_TO_PARAMS = ({ opt = {} }) =>
    Object.keys(FLAGS).reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        switch (key) {
            default:
                obj[key] = val;
        }

        return obj;
    }, {});

const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .option(FLAGS.update.flag, FLAGS.update.desc)
        .on('--help', HELP);

module.exports = {
    COMMAND,
    NAME,
};
