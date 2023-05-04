export default {
    ACTIONS: {
        RECYCLE: {
            addField: false,
            create: false,
            delete: false,
            retrieve: false,
            update: false,
        },
    },
    SCHEMA: {
        RECYCLE: {
            collection: {
                type: 'String',
            },
            object: {
                type: 'Object',
            },
            user: {
                type: 'Pointer',
                targetClass: '_User',
            },
            type: {
                type: 'String',
            },
        },
    },
};
