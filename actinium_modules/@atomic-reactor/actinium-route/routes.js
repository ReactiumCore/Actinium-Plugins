export default [
    {
        route: '/admin',
        blueprint: 'Admin',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['admin-ui.view'],
    },
];
