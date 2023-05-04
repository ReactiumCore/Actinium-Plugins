export default [
    {
        route: '/admin/users/page/:page',
        blueprint: 'Users',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['user-ui.view'],
    },
    {
        route: '/admin/users',
        blueprint: 'Users',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['user-ui.view'],
    },
    {
        route: '/admin/user/:id/:tab',
        blueprint: 'User-Editor',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['user-ui.view'],
    },
    {
        route: '/admin/user/:id',
        blueprint: 'User-Editor',
        meta: {
            builtIn: true,
            app: 'admin',
        },
        capabilities: ['user-ui.view'],
    },
];
