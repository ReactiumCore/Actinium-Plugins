import PLUGIN_ROUTES from './routes.js';

const MOD = () => {
    Actinium.Hook.register('start', async () => {
        // Save Routes
        if (typeof Actinium.Route === 'undefined') return;
        for (const route of PLUGIN_ROUTES) {
            try {
                await Actinium.Route.save(route);
            } catch (err) {}
        }
    });
};

export default MOD();
