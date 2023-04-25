import fs from 'node:fs';
import op from 'object-path';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const blueprintReg = async () => {
    const { default: PLUGIN_BLUEPRINTS } = await import('./blueprints.js');
    PLUGIN_BLUEPRINTS.forEach((blueprint) =>
        Actinium.Blueprint.register(blueprint.ID, blueprint),
    );
};

const MOD = async () => {
    const PLUGIN = {
        ID: 'Components',
        description: 'Enable Components to be used in content rich text editor',
        name: 'Components Plugin',
        order: 100,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
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
    Actinium.Hook.register('before-capability-load', () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
        const read = { allowed: ['anonymous'] };
        Actinium.Capability.register('components.write');
        Actinium.Capability.register('components.delete');
        Actinium.Capability.register('components.read', read);
        Actinium.Capability.register('setting.components-set');
        Actinium.Capability.register('setting.components-delete');
        Actinium.Capability.register('setting.components-get', read);
    });

    /**
     * ----------------------------------------------------------------------------
     * Hook registration
     * ----------------------------------------------------------------------------
     */

    // Start: Blueprints
    Actinium.Hook.register('start', async () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
        await blueprintReg();
    });

    // Activate: Register Routes & Blueprints
    Actinium.Hook.register('activate', async ({ ID }) => {
        if (ID !== PLUGIN.ID) return;

        await blueprintReg();

        const { default: PLUGIN_ROUTES } = await import('./routes.js');
        await Promise.all(
            PLUGIN_ROUTES.map((route) =>
                Actinium.Route.save(route, { useMasterKey: true }),
            ),
        );
    });

    // Deactivate: Blueprints
    Actinium.Hook.register('deactivate', async ({ ID }) => {
        if (ID !== PLUGIN.ID) return;

        // Remove blueprints
        const { default: PLUGIN_BLUEPRINTS } = await import('./blueprints.js');
        PLUGIN_BLUEPRINTS.forEach((blueprint) =>
            Actinium.Blueprint.unregister(blueprint.ID),
        );

        // Remove routes
        const { default: PLUGIN_ROUTES } = await import('./routes.js');
        await Promise.all(
            PLUGIN_ROUTES.map((route) =>
                Actinium.Route.delete(route, { useMasterKey: true }),
            ),
        );
    });
};

export default MOD();
