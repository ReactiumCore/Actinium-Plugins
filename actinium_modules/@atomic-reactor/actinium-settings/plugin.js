import fs from 'fs';
import _ from 'underscore';
import op from 'object-path';
import PLUGIN_ROUTES from './routes.js';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = async () => {
    const { default: SDK } = await import(`${BASE_DIR}/.core/lib/setting.js`);

    const { CloudCapOptions, CloudHasCapabilities } = Actinium.Utils;

    const PLUGIN = {
        ID: 'Settings',
        description: 'Settings plugin used to manage application settings',
        name: 'Settings Plugin',
        order: Actinium.Enums.priority.highest * 10,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
            plugin: op.get(pkg, 'version'),
        },
        meta: {
            group: 'core',
            builtIn: true,
        },
    };

    const COLLECTION = 'Setting';

    /**
 * @api {Cloud} setting-set setting-set
 * @apiVersion 3.1.1
 * @apiGroup Cloud
 * @apiName setting-set
 * @apiDescription Create or update a setting object. Capabilities will be enforced.
 * @apiParam {String} key The unique setting key.
 * @apiParam {Mixed} value The setting value.
 * @apiParam {Object} [permissions] List of permissions to be applied to the setting. See [CloudACL](#api-Actinium-CloudACL) helper for more information.
 * @apiPermission `Setting.create`, `Setting.update` or `setting.${key}-set` capabilities. e.g. If you wish to allow a role to modify the `site` setting (or `site.hostname`), you would give that role the `setting.site-set` capability.
 * @apiExample Example Usage:
// Create a publicly readable site setting object
Actinium.Cloud.run('setting-set', { key: 'site', value: {title: 'My Site', hostname: 'mysite.com'}, permissions: [
        {
            permission: 'read',
            type: 'public',
            allow: true,
        },
        {
            permission: 'write',
            type: 'public',
            allow: false,
        },

]});
 */
    const set = async (req) => {
        const { params = {} } = req;
        const { key = '', value } = params;
        const [group, ...settingPath] = key.split('.');
        if (!group) return;

        const strict = false;

        // permission to create new or update this setting
        if (
            !CloudHasCapabilities(
                req,
                [
                    `${COLLECTION}.create`,
                    `${COLLECTION}.update`,
                    `setting.${group}-set`,
                ],
                strict,
            )
        )
            return Promise.reject('Permission denied.');

        if (!isValid(value)) {
            return Promise.reject('invalid setting type: ' + typeof value);
        }

        const masterOptions = Actinium.Utils.MasterOptions();

        Actinium.Cache.del(`setting.${group}`);

        let obj = await new Actinium.Query(COLLECTION)
            .equalTo('key', group)
            .first(masterOptions);
        obj = obj || new Actinium.Object(COLLECTION);

        let objValue;
        if (settingPath.length) {
            objValue = op.get(obj.get('value'), 'value', {});
            op.set(objValue, settingPath, value);
        } else {
            objValue = value;
        }

        obj.set('key', group);
        obj.set('value', { value: objValue });

        const permissions = op.get(params, 'permissions', [
            {
                permission: 'read',
                type: 'public',
                allow: false,
            },
            {
                permission: 'write',
                type: 'public',
                allow: false,
            },
        ]);

        const groupACL = await Actinium.Utils.CloudACL(
            permissions,
            `setting.${group}-get`, // read
            `setting.${group}-set`, // write
            obj.getACL(),
        );

        obj.setACL(groupACL);

        const setting = await obj.save(null, masterOptions);

        Actinium.Cache.set(
            `setting.${key}`,
            objValue,
            Actinium.Enums.cache.dataLoading,
        );

        const result = op.get(setting.get('value'), 'value');
        if (settingPath.length) {
            return op.get(result, settingPath);
        }

        return result;
    };

    /**
 * @api {Cloud} setting-unset setting-unset
 * @apiVersion 3.1.1
 * @apiGroup Cloud
 * @apiName setting-unset
 * @apiDescription Unsets a setting value. Capabilities will be enforced.
 * @apiParam {String} key The unique setting key.
 * @apiPermission `Setting.delete` or `setting.${key}-delete` capabilities.
 * @apiExample Example Usage:
Actinium.Cloud.run('setting-unset', { key: 'site' });
 */
    const del = async (req) => {
        const { key = '' } = req.params;
        const [group, ...settingPath] = key.split('.');

        // delete only for top-level groups, otherwise set
        if (settingPath.length) {
            op.del(req, 'params.value');
            return set(req);
        }

        const strict = false;

        // permission to create new or update this setting
        if (
            !CloudHasCapabilities(
                req,
                [`${COLLECTION}.delete`, `setting.${group}-delete`],
                strict,
            )
        )
            return Promise.reject('Permission denied.');

        const opts = CloudCapOptions(
            req,
            [`${COLLECTION}.delete`, `setting.${group}-delete`],
            strict,
        );

        let obj = await new Actinium.Query(COLLECTION)
            .equalTo('key', group)
            .first(opts);

        return obj ? obj.destroy(opts) : Promise.resolve();
    };

    const isValid = (value) => {
        const checks = [
            'isEmpty',
            'isBoolean',
            'isNumber',
            'isString',
            'isDate',
            'isArray',
            'isObject',
        ];

        return checks.reduce((status, func) => _[func](value) || status, false);
    };

    const afterSave = (req) => {
        const { key, value } = req.object.toJSON();
        Actinium.Cache.set(`setting.${key}`, op.get(value, 'value'));
    };

    const afterDel = (req) => {
        const { key = '' } = req.object.toJSON();

        Actinium.Cache.del(`setting.${key}`);
        Actinium.Capability.unregister(`setting.${key}-set`);
        Actinium.Capability.unregister(`setting.${key}-get`);
        Actinium.Capability.unregister(`setting.${key}-delete`);
        Actinium.Hook.run('setting-unset', key);
    };

    const beforeSave = async (req) => {
        const { key, value } = req.object.toJSON();

        if (req.original) {
            const { value: previous } = req.original.toJSON();

            if (!_.isEqual(previous, value)) {
                Actinium.Hook.run('setting-change', key, value, previous);
            }
        }

        Actinium.Cache.set(`setting.${key}`, op.get(value, 'value'));
        Actinium.Hook.run('setting-set', key, value);
    };

    const saveRoutes = async () => {
        if (typeof Actinium.Route === 'undefined') return;
        for (const route of PLUGIN_ROUTES) {
            await Actinium.Route.save(route);
        }
    };

    Actinium.Plugin.register(PLUGIN, true);

    Actinium.Capability.register(
        `${COLLECTION}.create`,
        {},
        Actinium.Enums.priority.highest,
    );
    Actinium.Capability.register(
        `${COLLECTION}.retrieve`,
        {},
        Actinium.Enums.priority.highest,
    );
    Actinium.Capability.register(
        `${COLLECTION}.update`,
        {},
        Actinium.Enums.priority.highest,
    );
    Actinium.Capability.register(
        `${COLLECTION}.delete`,
        {},
        Actinium.Enums.priority.highest,
    );
    Actinium.Capability.register(
        `${COLLECTION}.addField`,
        {},
        Actinium.Enums.priority.highest,
    );

    Actinium.Capability.register(
        'settings-ui.view',
        {},
        Actinium.Enums.priority.highest,
    );

    // Anonymous - Non Sensitive settings groups only!
    Actinium.Hook.register(
        'before-capability-load',
        () => {
            SDK.anonymousGroup.list.forEach(({ id }) =>
                Actinium.Capability.register(`setting.${id}-get`, {
                    allowed: ['anonymous', 'user', 'contributor', 'moderator'],
                }),
            );
        },
        Actinium.Enums.priority.lowest,
    );

    // All operations on settings are privileged
    Actinium.Collection.register(
        COLLECTION,
        {
            create: false,
            retrieve: false,
            update: false,
            delete: false,
            addField: false,
        },
        {
            key: {
                type: 'String',
            },
            value: {
                type: 'Object',
            },
        },
        ['key'],
    );

    Actinium.Hook.register(
        'settings-acl-roles',
        async (context) => {
            context.roles = ['administrator', 'super-admin'];
        },
        Actinium.Enums.priority.highest,
    );

    // Active: Routes - Update routes on plugin activation
    Actinium.Hook.register('activate', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            await saveRoutes();
        }
    });

    // Deactivate: Routes - Remove routes on deactivation
    Actinium.Hook.register('deactivate', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            const PLUGIN_ROUTES = require('./routes.js');
            for (const route of PLUGIN_ROUTES) {
                await Actinium.Route.delete(route);
            }
        }
    });

    // Update routes on startup
    Actinium.Hook.register('start', async () => {
        if (Actinium.Plugin.isActive(PLUGIN.ID)) {
            await saveRoutes();
        }
    });

    // Update routes on plugin update
    Actinium.Hook.register('update', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            await saveRoutes();
        }
    });

    // Running hook
    Actinium.Hook.register('running', async () => {
        Actinium.Pulse.define(
            'settings-sync',
            {
                schedule: op.get(ENV, 'SETTINGS_SYNC_SCHEDULE', '* * * * *'),
            },
            async () => {
                const prevSettings = Actinium.Cache.get('setting');
                const settings = await SDK.load();
                Actinium.Hook.run('settings-sync', settings, prevSettings);
            },
        );
    });

    Actinium.Cloud.define(PLUGIN.ID, 'settings', SDK.list);
    Actinium.Cloud.define(PLUGIN.ID, 'setting-get', (req) => {
        const key = op.get(req, 'params.key');
        const [group] = String(key).split('.');

        const options = CloudCapOptions(
            req,
            [`${COLLECTION}.retrieve`, `setting.${group}-get`],
            false,
        );

        return SDK.get(key, null, options);
    });

    Actinium.Cloud.define(PLUGIN.ID, 'setting-set', set);
    Actinium.Cloud.define(PLUGIN.ID, 'setting-save', set);
    Actinium.Cloud.define(PLUGIN.ID, 'setting-unset', del);
    Actinium.Cloud.define(PLUGIN.ID, 'setting-del', del);
    Actinium.Cloud.define(PLUGIN.ID, 'setting-rm', del);

    Actinium.Cloud.afterDelete(COLLECTION, afterDel);
    Actinium.Cloud.afterSave(COLLECTION, afterSave);
    Actinium.Cloud.beforeSave(COLLECTION, beforeSave);
};

export default MOD();
/**
 * @api {Object} Actinium.Setting Setting
 * @apiVersion 3.1.1
 * @apiName Setting
 * @apiGroup Actinium
 * @apiDescription Manage application setting key/value pairs.
 Actinium settings are provided to you can manage your running configuration for your application.
 By default, each setting is securely stored so that only users that should have access to a setting
 are permitted to set, get, or delete settings on the site.

 The following capabilities can be assigned to your roles for settings:

 | Capability | Default Roles | Description |
 | ---- | --- | ----- |
 | Setting.create | administrator,super-admin | Ability to create a new setting. |
 | Setting.retrieve | administrator,super-admin | Ability to retrieve any/all settings. |
 | Setting.update | administrator,super-admin | Ability to edit any existing setting. |
 | Setting.delete | administrator,super-admin | Ability to delete any existing setting. |
 | setting.${group}-get | administrator,super-admin | Ability to retrieve the setting with `group` setting group. e.g. setting.foo-get to allow get of setting group `foo` |
 | setting.${group}-set | administrator,super-admin | Ability to edit the setting with `group` setting group. e.g. setting.foo-set to allow edit of setting group `foo` |
 | setting.${group}-delete | administrator,super-admin | Ability to delete the setting with `group` setting group. e.g. setting.foo-delete to allow delete of setting group `foo` |
 */

/**
 * @api {Cloud} settings settings
 * @apiVersion 3.1.1
 * @apiGroup Cloud
 * @apiName settings
 * @apiDescription Retrieves the list of settings. Capabilities will be enforced.
 * @apiPermission `Setting.retrieve` or individual `setting.${key}-get` permissions.
 * @apiExample Example Usage:
Actinium.Cloud.run('settings');
 */

/**
  * @api {Cloud} setting-get setting-get
  * @apiVersion 3.1.1
  * @apiGroup Cloud
  * @apiName setting-get
  * @apiDescription Retrieves a specifc setting object. Capabilities will be enforced.
  * @apiParam {String} key The unique setting key.
  * @apiPermission `Setting.retrieve` or `setting.${key}-get` capabilities. e.g. If your top-level key is site, the `setting.site-get` capability with grant a role the ability to read this setting. Note that sub-keys, such as `site.hostname` will use the top-level `setting.site-get` capability.
  * @apiExample Example Usage:
 Actinium.Cloud.run('setting-get', { key: 'site'});
  */
