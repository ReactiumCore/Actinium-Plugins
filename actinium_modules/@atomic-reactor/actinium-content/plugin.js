import './sdk.js';
import _ from 'underscore';
import op from 'object-path';
import PLUGIN_ROUTES from './routes.js';
import PLUGIN_SCHEMA from './schema.js';

const MOD = () => {
    const { CloudRunOptions } = Actinium.Utils;

    const PLUGIN = {
        order: 100,
        bundle: [],
        ID: 'actinium-content',
        name: 'Content Type Plugin',
        description: 'Plugn for managing Actinium content',
        meta: {
            builtIn: false,
        },
        version: {
            plugin: Actinium.Content.version,
            actinium: '>=5.1.0',
            reactium: '>=5.0.0',
        },
    };

    /**
     * ----------------------------------------------------------------------------
     * Plugin registration
     * ----------------------------------------------------------------------------
     */
    Actinium.Plugin.register(PLUGIN, true);

    /**
     * ----------------------------------------------------------------------------
     * Hook registration
     * ----------------------------------------------------------------------------
     */
    const saveRoutes = async () => {
        for (const route of PLUGIN_ROUTES) {
            await Actinium.Route.save(route);
        }
    };

    // Update routes on startup
    Actinium.Hook.register('start', async () => {
        if (Actinium.Plugin.isActive(PLUGIN.ID)) await saveRoutes();
    });

    // Update routes on plugin activation
    Actinium.Hook.register('activate', async ({ ID }) => {
        if (ID === PLUGIN.ID) await saveRoutes();
    });

    // Update routes on plugin update
    Actinium.Hook.register('update', async ({ ID }) => {
        if (ID === PLUGIN.ID) await saveRoutes();
    });

    // Remove routes on deactivation
    Actinium.Hook.register('deactivate', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            for (const route of PLUGIN_ROUTES) {
                await Actinium.Route.delete(route);
            }
        }
    });

    Actinium.Hook.register('schema', async () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
        PLUGIN_SCHEMA.forEach((item) => {
            const { actions = {}, collection, schema = {} } = item;

            Actinium.Collection.register(collection, actions, _.clone(schema));

            Object.keys(actions).forEach((action) =>
                Actinium.Capability.register(
                    String(`${collection}.${action}`).toLowerCase(),
                ),
            );
        });
    });

    /**
     * ----------------------------------------------------------------------------
     * Cloud Functions
     * ----------------------------------------------------------------------------
     */
    // content-save
    Actinium.Cloud.define(PLUGIN.ID, 'content-save', (req) => {
        req.params.user = op.get(req.params, 'user', req.user);
        return Actinium.Content.save(req.params, CloudRunOptions(req));
    });

    // content-list
    Actinium.Cloud.define(PLUGIN.ID, 'content-list', (req) =>
        Actinium.Content.find(req.params, CloudRunOptions(req)),
    );

    // content-delete
    Actinium.Cloud.define(PLUGIN.ID, 'content-delete', (req) =>
        Actinium.Content.delete(req.params, CloudRunOptions(req)),
    );

    // content-purge
    Actinium.Cloud.define(PLUGIN.ID, 'content-purge', (req) =>
        Actinium.Content.purge(req.params, CloudRunOptions(req)),
    );

    // content-retrieve
    Actinium.Cloud.define(PLUGIN.ID, 'content-retrieve', (req) =>
        Actinium.Content.retrieve(req.params, CloudRunOptions(req)),
    );

    // content-exists
    Actinium.Cloud.define(PLUGIN.ID, 'content-exists', (req) =>
        Actinium.Content.exists(req.params, CloudRunOptions(req)),
    );

    /**
     * ----------------------------------------------------------------------------
     * afterFind hooks
     * ----------------------------------------------------------------------------
     */

    Actinium.Cloud.afterFind('Content', async (req) => {
        await Actinium.Hook.run('content-after-find', req);
        return req.objects;
    });

    /**
     * ----------------------------------------------------------------------------
     * afterDelete hooks
     * ----------------------------------------------------------------------------
     */

    Actinium.Cloud.afterDelete('Content', async (req) => {
        await Actinium.Hook.run('content-after-delete', req);
    });

    /**
     * ----------------------------------------------------------------------------
     * afterSave hooks
     * ----------------------------------------------------------------------------
     */

    Actinium.Cloud.afterSave('Content', async (req) => {
        await Actinium.Hook.run('content-after-save', req);
    });

    /**
     * ----------------------------------------------------------------------------
     * beforeFind hooks
     * ----------------------------------------------------------------------------
     */

    Actinium.Cloud.beforeFind('Content', async (req) => {
        await Actinium.Hook.run('content-before-find', req);
    });

    /**
     * ----------------------------------------------------------------------------
     * beforeDelete hooks
     * ----------------------------------------------------------------------------
     */

    Actinium.Cloud.beforeDelete('Content', async (req) => {
        await Actinium.Hook.run('content-before-delete', req);
    });

    /**
     * ----------------------------------------------------------------------------
     * beforeSave hooks
     * ----------------------------------------------------------------------------
     */

    Actinium.Cloud.beforeSave('Content', Actinium.Content.beforeSave);
};

export default MOD();
