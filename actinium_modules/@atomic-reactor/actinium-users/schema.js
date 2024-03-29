export default {
    ACTIONS: {
        addField: false,
        create: true,
        delete: false,
        retrieve: true,
        update: true,
    },
    SCHEMA: {
        fname: {
            type: 'String',
        },
        lname: {
            type: 'String',
        },
        avatar: {
            type: 'String',
        },
        meta: {
            type: 'Object',
        },
        prefs: {
            type: 'Object',
        },
    },
    INDEX: ['fname', 'lname'],
};
