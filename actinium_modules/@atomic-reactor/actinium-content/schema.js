export default [
    {
        collection: 'Content',
        indexes: ['uuid', 'slug', 'title'],
        schema: {
            title: {
                type: 'String',
            },
            meta: {
                type: 'Object',
            },
            data: {
                type: 'Object',
            },
            slug: {
                type: 'String',
            },
            uuid: {
                type: 'String',
            },
            taxonomy: {
                type: 'Relation',
                targetClass: 'Taxonomy',
            },
            type: {
                type: 'Pointer',
                targetClass: 'Type',
            },
            status: {
                type: 'String',
            },
            user: {
                type: 'Pointer',
                targetClass: '_User',
            },
            parent: {
                type: 'Pointer',
                targetClass: 'Content',
            },
            children: {
                type: 'Relation',
                targetClass: 'Content',
            }
        },
        actions: {
            addField: false,
            create: true,
            retrieve: true,
            update: true,
            delete: true,
        },
    },
];
