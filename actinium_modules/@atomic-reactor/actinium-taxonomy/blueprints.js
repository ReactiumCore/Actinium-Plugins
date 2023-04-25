export default [
    {
        ID: 'taxonomy-blueprint',
        description: 'Taxonomy Blueprint',
        className: 'blueprint-taxonomy',
        sections: {
            sidebar: {
                zones: ['admin-sidebar'],
                meta: {},
            },
            main: {
                zones: [
                    'admin-header',
                    'admin-taxonomy-content',
                    'admin-actions',
                ],
                meta: {},
            },
        },
        meta: {
            admin: true,
            builtIn: true,
            namespace: 'admin-page',
        },
    },
];
