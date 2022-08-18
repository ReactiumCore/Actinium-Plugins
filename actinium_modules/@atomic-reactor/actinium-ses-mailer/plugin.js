const chalk = require('chalk');
const op = require('object-path');
const aws = require('@aws-sdk/client-ses');
const nodemailer = require('nodemailer');
const { getDefaultRoleAssumerWithWebIdentity } = require('@aws-sdk/client-sts');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { CloudHasCapabilities } = require(`${ACTINIUM_DIR}/lib/utils`);

const PLUGIN = {
    ID: 'ses-mailer',
    name: 'AWS SES Mailer',
    description: 'AWS SES Mailer plugin for Actinium',
    order: 100,
    version: {
        actinium: '>=3.7.21',
        plugin: '0.0.1',
        reactium: '>=4.0.0',
    },
    bundle: [],
    meta: {
        builtIn: true,
    },
};

/**
 * ----------------------------------------------------------------------------
 * Plugin registration
 * ----------------------------------------------------------------------------
 */
Actinium.Plugin.register(PLUGIN, false);

/**
 * ----------------------------------------------------------------------------
 * Hook registration
 * ----------------------------------------------------------------------------
 */

const getSettings = async () => {
    const settings = Actinium.Setting.get('ses-mailer', {});
    return {
        region:
            op.get(
                settings,
                'region',
                op.get(ENV, 'AWS_DEFAULT_REGION', 'us-east-2'),
            ) || 'us-east-2',
        ...settings,
    };
};

Actinium.Hook.register('start', async () => {
    if (Actinium.Plugin.isActive(PLUGIN.ID)) {
        const { region } = await getSettings();

        Actinium.Hook.register(
            'mailer-transport',
            async context => {
                BOOT('');
                BOOT(chalk.magenta.bold('AWS SES Mail Transport'));

                const ses = new aws.SES({
                    apiVersion: '2010-12-01',
                    region,
                    defaultProvider: defaultProvider({
                        roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity,
                    }),
                });

                context.transport = nodemailer.createTransport({
                    SES: { ses, aws },
                });
            },
            1,
        );
    }
});

Actinium.Hook.register(
    'schema',
    async ({ ID }) => {
        // ignore plugin installs
        if (ID) return;

        Actinium.Capability.register('send-mail', {
            allowed: [],
        });
    },
    Actinium.Enums.priority.lowest,
);

Actinium.Cloud.define(PLUGIN.ID, 'send-mail', async req => {
    const allowed = CloudHasCapabilities(req, ['send-mail']);
    if (allowed) {
        const message = op.get(req, 'params', {});
        return Actinium.Mail.send(message);
    }
    throw new Error('Not permitted');
});
