import fs from 'node:fs';
import chalk from 'chalk';
import op from 'object-path';
import nodemailer from 'nodemailer';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const PLUGIN = {
        ID: 'SMTP-MAILER',
        description: 'SMTP mailer plugin.',
        name: 'SMTP mailer plugin.',
        order: 0,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
            plugin: op.get(pkg, 'version'),
        },
        meta: {
            group: 'mail',
        },
    };

    Actinium.Plugin.register(PLUGIN);

    const getSettings = async () => {
        const defaults = {};
        const settingsFile = op.get(ENV, 'SMTP_MAILER_SETTINGS_FILE', false);
        if (settingsFile && fs.existsSync(settingsFile)) {
            try {
                const settings = JSON.parse(
                    fs.readFileSync(settingsFile, 'utf8'),
                );
                Object.entries(settings).forEach(([key, value]) => {
                    op.set(defaults, key, value);
                });
            } catch (error) {
                ERROR('');
                ERROR(
                    chalk.magenta.bold('Warning'),
                    chalk.cyan('ENV.SMTP_MAILER_SETTINGS_FILE'),
                    'invalid or does not contain valid JSON settings (host, domain, user, pass)!',
                );
            }
        } else {
            op.set(defaults, 'host', op.get(ENV, 'SMTP_MAILER_HOST'));
            op.set(defaults, 'port', op.get(ENV, 'SMTP_MAILER_PORT'));
            op.set(defaults, 'user', op.get(ENV, 'SMTP_MAILER_USER'));
            op.set(defaults, 'pass', op.get(ENV, 'SMTP_MAILER_PASS'));
        }

        return Actinium.Setting.get('smtp', defaults);
    };

    Actinium.Hook.register('start', async () => {
        if (Actinium.Plugin.isActive(PLUGIN.ID)) {
            const settings = await getSettings();

            Actinium.Hook.unregister(
                Actinium.Plugin.exports('MAILER.warningHookId'),
            );

            Actinium.Hook.register('warning', () => {
                const { host, port, user, pass } = settings;
                if (!(host && port && user && pass)) {
                    WARN('');
                    !host &&
                        WARN(
                            chalk.magenta.bold('Warning'),
                            chalk.cyan(
                                'smtp.host setting or ENV.SMTP_MAILER_HOST',
                            ),
                            'is not set!',
                        );
                    !port &&
                        WARN(
                            chalk.magenta.bold('Warning'),
                            chalk.cyan(
                                'smtp.port setting or ENV.SMTP_MAILER_PORT',
                            ),
                            'is not set!',
                        );
                    !user &&
                        WARN(
                            chalk.magenta.bold('Warning'),
                            chalk.cyan(
                                'smtp.user setting or ENV.SMTP_MAILER_USER',
                            ),
                            'is not set!',
                        );
                    !pass &&
                        WARN(
                            chalk.magenta.bold('Warning'),
                            chalk.cyan(
                                'smtp.pass setting or ENV.SMTP_MAILER_PASS',
                            ),
                            'is not set!',
                        );
                }

                return Promise.resolve();
            });

            Actinium.Hook.register(
                'mailer-transport',
                async (context) => {
                    const { host, port, user, pass } = settings;

                    WARN('');
                    WARN(chalk.magenta.bold('SMTP-MAILER Transport'));
                    if (host && port && user && pass) {
                        const transportOptions = {
                            host,
                            port,
                            auth: {
                                user,
                                pass,
                            },
                        };

                        context.transport =
                            nodemailer.createTransport(transportOptions);
                    }

                    return Promise.resolve();
                },
                1,
            );
        }

        return Promise.resolve();
    });

    return PLUGIN;
};

export default MOD();
