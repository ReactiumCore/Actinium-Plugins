export default [
    {
        route: '/admin/type/:id',
        blueprint: 'ContentType',
        meta: {
            builtIn: true,
            order: 0,
            app: 'admin',
        },
        capabilities: ['type-ui.view'],
    },
    {
        route: '/admin/type',
        blueprint: 'ContentType',
        meta: {
            builtIn: true,
            order: 0,
            app: 'admin',
        },
        capabilities: ['type-ui.view'],
    },
    {
        route: '/admin/types',
        blueprint: 'ContentTypes',
        meta: {
            builtIn: true,
            order: 0,
            app: 'admin',
        },
        capabilities: ['type-ui.view'],
    },
];
