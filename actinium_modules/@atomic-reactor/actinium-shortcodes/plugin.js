import fs from 'node:fs';
import op from 'object-path';
import PLUGIN_ROUTES from './routes.js';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const PLUGIN = {
        ID: 'Shortcodes',
        description: 'Enable Shortcodes to be used in content rich text editor',
        name: 'Shortcodes Plugin',
        order: 100,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
            plugin: op.get(pkg, 'version'),
        },
        bundle: [],
        meta: {
            admin: true,
            settings: false,
            builtIn: false,
            group: 'utilities',
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
     * Capability registration
     * ----------------------------------------------------------------------------
     */
    const registerCaps = () => {
        const allowed = ['contributor', 'moderator'];
        Actinium.Capability.register('shortcodes.create', { allowed });
        Actinium.Capability.register('shortcodes.retrieve', { allowed });
        Actinium.Capability.register('shortcodes.update', { allowed });
        Actinium.Capability.register('shortcodes.delete', { allowed });
        Actinium.Capability.register('setting.shortcodes-set', { allowed });
        Actinium.Capability.register('setting.shortcodes-delete', { allowed });
        Actinium.Setting.anonymousGroup.register('shortcodes', {
            id: 'shortcodes',
        });
    };

    /**
     * ----------------------------------------------------------------------------
     * Hook registration
     * ----------------------------------------------------------------------------
     */


    // Caps
    Actinium.Hook.register('activate', ({ ID }) => {
        if (ID !== PLUGIN.ID) return;
        registerCaps();
    });

    // Routes
    const saveRoutes = async () => {
        for (const route of PLUGIN_ROUTES) {
            await Actinium.Route.save(route);
        }
    };

    // Update routes on startup
    Actinium.Hook.register('start', async () => {
        if (Actinium.Plugin.isActive(PLUGIN.ID)) {
            await saveRoutes();
        }
    });

    // Update routes on plugin activation
    Actinium.Hook.register('activate', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            await saveRoutes();
        }
    });

    // Update routes on plugin update
    Actinium.Hook.register('update', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            await saveRoutes();
        }
    });

    // Remove routes on deactivation
    Actinium.Hook.register('deactivate', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            for (const route of PLUGIN_ROUTES) {
                await Actinium.Route.delete(route);
            }
        }
    });
};

export default MOD();
