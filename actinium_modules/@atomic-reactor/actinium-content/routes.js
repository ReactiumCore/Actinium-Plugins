export default [
    {
        route: '/admin/content/:type/page/:page',
        blueprint: 'Content',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['content-ui.view'],
    },
    {
        route: '/admin/content/:type/:slug/branch/:branch',
        blueprint: 'Content-Editor',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['content-ui.view'],
    },
    {
        route: '/admin/content/:type/:slug',
        blueprint: 'Content-Editor',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['content-ui.view'],
    },
    {
        route: '/admin/content/:type',
        blueprint: 'Content',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['content-ui.view'],
    },
];
