import chalk from 'chalk';
import path from 'node:path';

const MOD = () => {
    Actinium.Hook.register(
        'warning',
        () => {
            const filePath = path.normalize(`${SRC_DIR}/env.dev.json`);

            WARN('');
            WARN(
                chalk.cyan.bold('Warning:'),
                'The default',
                chalk.magenta('env.dev.json'),
                'file has been created at:',
            );
            WARN(' ', chalk.cyan(filePath));
            WARN('');
            WARN(
                ' ',
                chalk.cyan.bold('Update the database connection string:'),
            );
            WARN(
                ' ',
                chalk.cyan.bold('$'),
                chalk.magenta.bold('reactium'),
                'db -d -u',
                chalk.cyan("'mongo://YOUR.CONNECTION.STRING'"),
            );
        },
        1000000000,
    );
};

export default MOD();
