export default [
    {
        collection: '_User',
        indexes: ['objectId', 'uuid'],
        schema: {
            uuid: {
                type: 'String',
            },
        },
        actions: {
            addField: false,
            create: true,
            retrieve: true,
            update: true,
            delete: true,
        },
    },
    {
        collection: 'User_meta',
        schema: {
            user: {
                type: 'Pointer',
                targetClass: '_User',
            },
            name: { type: 'Object' },
        },
        actions: {
            addField: true,
            create: true,
            retrieve: true,
            update: true,
            delete: true,
        },
    },
    {
        collection: 'User_pref',
        schema: {
            user: {
                type: 'Pointer',
                targetClass: '_User',
            },
        },
        actions: {
            addField: true,
            create: true,
            retrieve: true,
            update: true,
            delete: true,
        },
    },
];
