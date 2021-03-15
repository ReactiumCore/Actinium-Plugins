const pkg = require('./package');
const op = require('object-path');

const PLUGIN = {
    ID: 'Block',
    COLLECTION: 'Block',
    description: 'Plugin for creating content fragments.',
    name: 'Block Plugin',
    order: 100,
    bundle: [],
    hooks: [],
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
        plugin: op.get(pkg, 'version'),
    },
    meta: {
        group: 'Editing',
        builtIn: true,
    },
};

PLUGIN.hooks.push([
    'collection-before-load',
    collection => {
        if (collection !== 'Content_block') return;
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

        Actinium.Type.register({
            type: PLUGIN.COLLECTION,
            machineName: String(PLUGIN.COLLECTION).toLowerCase(),
            regions: {
                default: {
                    id: 'default',
                    label: 'Default',
                    slug: 'default',
                    order: -1000,
                },
                sidebar: {
                    id: 'sidebar',
                    label: 'Sidebar',
                    slug: 'sidebar',
                    order: 1000,
                },
            },
            meta: {
                icon: 'Linear.Cube',
                label: 'Block',
            },
            fields: {
                'cc5a47e7-58c0-4a69-98d6-3c272f4b0bf2': {
                    fieldName: 'Content',
                    label: 'Block Content',
                    placeholder: null,
                    helpText: null,
                    fieldId: 'cc5a47e7-58c0-4a69-98d6-3c272f4b0bf2',
                    fieldType: 'RichText',
                    region: 'default',
                },
                publisher: {
                    fieldName: 'Publish',
                    statuses: 'DRAFT,PUBLISHED',
                    simple: true,
                    fieldId: 'publisher',
                    fieldType: 'Publisher',
                    region: 'sidebar',
                },
            },
        });
    },
]);

module.exports = PLUGIN;
