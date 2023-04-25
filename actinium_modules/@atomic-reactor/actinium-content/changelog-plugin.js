import fs from 'node:fs';
import op from 'object-path';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const PLUGIN = {
    ID: 'Changelog',
    name: 'Change Log',
    description: 'Content change log',
    meta: {
        group: 'core',
        builtIn: true,
    },
    version: {
        actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
        plugin: op.get(pkg, 'version'),
    },
};

const COLLECTION = PLUGIN.ID;

Actinium.Plugin.register(PLUGIN, true);

Actinium.Collection.register(
    COLLECTION,
    {
        create: false,
        retrieve: true,
        update: false,
        delete: false,
        addField: false,
    },
    {
        contentId: {
            type: 'String',
        },
        collection: {
            type: 'String',
        },
        userId: {
            type: 'String',
        },
        changeType: {
            type: 'String',
        },
        meta: {
            type: 'Object',
        },
    },
    ['contentId', 'collection', 'changeType'],
);

/**
 * @api {Asynchronous} changelog changelog
 * @apiParam {String} [orderBy=createdAt] Field to order the results by.
 * @apiParam {String} [direction=descending] Order "descending" or "ascending"
 * @apiParam {Number} [limit=1000] Limit page results
 * @apiParam {String} [userId] Parse user object id (alternative)
 * @apiParam {String} [contentId] objectId of the content
 * @apiParam {String} [collection] the Parse collection of the content
 * @apiParam {String} [changeType] the type of change being logged
 * @apiParam {Object} meta meta data for the change log
 * @apiName changelog
 * @apiGroup Actinium
 */
Actinium.Cloud.define(PLUGIN.ID, 'changelog', async (req) =>
    Actinium.Content.Log.list(req.params, Actinium.Utils.CloudRunOptions(req)),
);
