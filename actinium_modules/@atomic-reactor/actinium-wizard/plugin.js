const pkg = require('./package');
const op = require('object-path');

const PLUGIN = {
    ID: 'Wizard',
    COLLECTION: 'Wizard',
    description: 'Plugin for creating guided walk-throughs.',
    name: 'Wizard Plugin',
    order: 100,
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
        plugin: op.get(pkg, 'version'),
    },
    bundle: [],
    meta: {
        group: 'Editing',
        builtIn: true,
    },
};

Actinium.Plugin.register(PLUGIN);

/**
 * ----------------------------------------------------------------------------
 * Hooks
 * ----------------------------------------------------------------------------
 */

// content-schema-field-types hook
Actinium.Hook.register('content-schema-field-types', async fieldTypes => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
    fieldTypes['Wizard'] = { type: 'Array' };
});

Actinium.Hook.register('collection-before-load', async () => {
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
            icon: 'Linear.MagicWand',
            label: 'Wizard',
        },
        fields: {
            wizard: {
                fieldName: 'Wizard',
                placeholder: {
                    title: 'Title',
                    content: 'Content',
                },
                fieldId: 'wizard',
                fieldType: 'Wizard',
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
});
