import fs from 'node:fs';
import op from 'object-path';
const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const PLUGIN = {
        ID: 'Navigation',
        description: 'Add navigation content type.',
        name: 'Navigation Plugin',
        order: 100,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
            plugin: op.get(pkg, 'version'),
        },
        bundle: [],
        meta: {
            builtIn: false,
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
     * Hook registration
     * ----------------------------------------------------------------------------
     */

    Actinium.Hook.register('collection-before-load', async () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
        Actinium.Type.register({
            type: 'Navigation',
            machineName: 'navigation',
            fields: {
                navigation_menu_builder: {
                    fieldName: 'Menu Builder',
                    helpText: 'Build your navigation menu.',
                    fieldId: 'navigation_menu_builder',
                    fieldType: 'MenuBuilder',
                    region: 'default',
                },
                navigation_content: {
                    fieldName: 'Navigation Content',
                    label: null,
                    placeholder: null,
                    helpText:
                        'Add additional content along with this navigation.',
                    fieldId: 'navigation_content',
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
                label: 'Navigation',
                icon: 'Linear.Menu3',
            },
        });
    });
};

export default MOD();
