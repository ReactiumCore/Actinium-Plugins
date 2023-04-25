import fs from 'node:fs';
import op from 'object-path';
import nodemailer from 'nodemailer';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const PLUGIN = {
        ID: 'MAILER',
        description: 'Mailer plugin.',
        name: 'Mailer Plugin',
        order: 0,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
            plugin: op.get(pkg, 'version'),
        },
    };

    Actinium.Plugin.register(PLUGIN, true);

    const getSettings = async () => {
        return Actinium.Setting.get('mailer', {
            sendmail: true,
            path: op.get(ENV, 'SENDMAIL_BIN', '/usr/sbin/sendmail'),
            newline: op.get(ENV, 'SENDMAIL_NEWLINE_STYLE', 'unix'),
        });
    };

    Actinium.Hook.register(
        'mailer-transport',
        async (context) => {
            const settings = await getSettings();
            context.transport = nodemailer.createTransport(settings);

            return Promise.resolve();
        },
        0,
    );

    Actinium.Mail = {
        send: async (message) => {
            const context = await Actinium.Hook.run('mailer-transport');
            const transport = op.get(context, 'transport');
            if (!transport) {
                return Promise.reject('No mailer transport.');
            }

            return new Promise((resolve, reject) => {
                transport.sendMail(message, (err, info) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(info);
                });
            });
        },
    };

    return PLUGIN;
};

export default MOD();
