const PLUGIN_ROUTES = require('./routes');
const PLUGIN_BLUEPRINTS = require('./blueprints');

Actinium.Hook.register('start', async () => {
    // Register Blueprints
    if (typeof Actinium.Blueprint === 'undefined') return;
    PLUGIN_BLUEPRINTS.forEach(bp => Actinium.Blueprint.register(bp.ID, bp));

    // Save Routes
    if (typeof Actinium.Route === 'undefined') return;
    for (const route of PLUGIN_ROUTES) {
        try {
            await Actinium.Route.save(route);
        } catch (err) {}
    }
});
