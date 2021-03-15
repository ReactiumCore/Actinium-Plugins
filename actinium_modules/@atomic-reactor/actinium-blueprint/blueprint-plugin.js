const op = require('object-path');
const pkg = require('./package');

const PLUGIN = {
    ID: 'Blueprint',
    description: 'Blueprint plugin.',
    name: 'Blueprint Plugin',
    order: 0,
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.0.5'),
        plugin: op.get(pkg, 'version'),
    },
    meta: {
        group: 'core',
        builtIn: true,
    },
};

const SDK = require('./sdk');
Actinium.Blueprint = SDK;

Actinium.Plugin.register(PLUGIN, true);

Actinium.Capability.register(
    'blueprint.retrieve',
    {
        allowed: ['anonymous'],
        excluded: ['banned'],
    },
    1000,
);

// Add admin-tools zone when blueprint.meta.admin === true blueprints
Actinium.Hook.register('blueprints', async () => {
    const guarded = Actinium.Blueprint.protected;
    for (const bp of Actinium.Blueprint.list) {
        if (
            op.get(bp, 'meta.admin', false) === true &&
            !op.has(bp, 'sections.tools')
        ) {
            op.set(bp, 'sections.tools', {
                zones: ['admin-tools'],
            });

            if (guarded.includes(bp.ID)) Actinium.Blueprint.unprotect(bp.ID);
            Actinium.Blueprint.register(bp.ID, bp);
        }
    }
});

/**
* @api {Cloud} blueprints blueprints
* @apiVersion 3.1.2
* @apiGroup Cloud
* @apiName blueprints
* @apiDescription Get all blueprints.
* @apiExample All Example:
// get all blueprints
Actinium.Cloud.run('blueprints');
*/
Actinium.Cloud.define(PLUGIN.ID, 'blueprints', async () => {
    await Actinium.Hook.run('blueprints', Actinium.Blueprint);
    return Actinium.Blueprint.list;
});
