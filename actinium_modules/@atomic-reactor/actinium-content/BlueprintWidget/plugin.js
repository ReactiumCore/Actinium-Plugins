const pkg = require('../package');
const op = require('object-path');

const PLUGIN = {
    ID: 'BlueprintWidget',
    name: 'Blueprint Widget',
    meta: {
        group: 'Editing',
    },
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
        plugin: op.get(pkg, 'version'),
    },
};

Actinium.Plugin.register(PLUGIN, true);

Actinium.Hook.register('content-schema-field-types', fieldTypes => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
    fieldTypes['Blueprint'] = { type: 'String' };
});
