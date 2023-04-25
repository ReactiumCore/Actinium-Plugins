import PLUGIN from './info.json' assert { type: 'json' };
import semver from 'semver';
import op from 'object-path';

export default () => {
    // Add contentUUID because contentID isn't portable
    return Actinium.Hook.register('update', async (plugin, req, old) => {
        if (
            PLUGIN.ID === plugin.ID &&
            semver.gt('3.6.2', semver.coerce(op.get(old, 'version')))
        ) {
            const options = Actinium.Utils.MasterOptions();
            const rtQuery = new Parse.Query('Route');
            rtQuery.limit(100);
            let skip = 0;
            let routes = await rtQuery.find(options);

            while (routes.length > 0) {
                for (const route of routes) {
                    const { collection, contentId } = route.get('meta') || {};
                    if (collection && contentId) {
                        const obj = new Parse.Object(collection);
                        obj.id = contentId;
                        const content = await obj.fetch(options);
                        route.set('meta.contentUUID', content.get('uuid'));
                    }
                }

                await Parse.Object.saveAll(routes, options);
                rtQuery.skip((skip += 100));
                routes = await rtQuery.find(options);
            }
        }
    });
};
