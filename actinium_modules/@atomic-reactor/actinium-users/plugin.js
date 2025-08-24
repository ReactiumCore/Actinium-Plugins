import fs from 'node:fs';
import op from 'object-path';
import PLUGIN_SCHEMA from './schema.js';
import PLUGIN_ROUTES from './routes.js';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const { AclTargets, CloudRunOptions, MasterOptions } = Actinium.Utils;

    const COLLECTION = '_User';

    const PLUGIN = {
        ID: 'Users',
        description: 'Users plugin used to manage users.',
        name: 'Users Plugin',
        order: 0,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
            plugin: op.get(pkg, 'version'),
        },
        meta: {
            group: 'core',
            builtIn: true,
        },
    };

    const avatarTypes = {
        jpeg: 'jpg',
        jpg: 'jpg',
        png: 'png',
        gif: 'gif',
        svg: 'svg',
    };

    const afterFind = async (req) => {
        const { objects = [] } = req;

        if (Actinium.running !== true) {
            return objects;
        }

        /*
         * ---------------------------------------------------------------------------------------------------
            // TODO: Figure out a better way to implement this w/o iterating over the objects on every find
         * ---------------------------------------------------------------------------------------------------
        for (let i = 0; i < objects.length; i++) {
            let user = objects[i];

            const roles = Actinium.Roles.User.get(user.id);
            const capabilities = Actinium.Capability.User.get(user.id);

            await Actinium.Hook.run('user-fetch', user);

            user.set('roles', roles);
            user.set('capabilities', capabilities);
            objects[i] = user;
        }
        */

        await Actinium.Hook.run('user-fetch', objects);

        return Promise.resolve(objects);
    };

    const beforeLogin = async (req) => {
        const { object: user } = req;
        const roles = Actinium.Roles.User.get(user.id);

        if (op.has(roles, 'banned')) {
            throw new Error('Access denied, you have been banned.');
        }

        await Actinium.Hook.run('user-before-login', user);
    };

    const find = (req) => {
        const options = CloudRunOptions(req);
        return Actinium.User.list(req.params, options);
    };

    const retrieve = (req) => {
        const options = CloudRunOptions(req);
        return Actinium.User.retrieve(req.params, options);
    };

    const roles = async (req) => {
        if (!req.user) return [];

        const options = { useMaskterKey: true, json: false };
        const qry = new Actinium.Query(Actinium.Role);
        qry.equalTo('users', req.user);
        qry.descending('level');

        const results = await qry.find(options);

        return results.reduce((roles, item) => {
            roles['anonymous'] = 0;
            roles[item.get('name')] = item.get('level');
            return roles;
        }, {});
    };

    const save = (req) => {
        const options = CloudRunOptions(req);
        return Actinium.User.save(req.params, options);
    };

    const trash = (req) => {
        const options = CloudRunOptions(req);
        return Actinium.User.trash(req.params, options, req.user);
    };

    const validate = (req) => {
        if (!op.get(req, 'user')) {
            throw new Error('invalid session token');
        }

        return true;
    };

    const afterSave = (req) => {
        Actinium.Hook.run('user-after-save', req);
    };

    const beforeSave = async (req) => {
        req.object.unset('confirm');
        await Actinium.Hook.run('user-before-save', req);
    };

    const afterDelete = async (req) => {
        await Actinium.Hook.run('user-after-delete', req);
    };

    const beforeDelete = async (req) => {
        await Actinium.Hook.run('user-before-delete', req);
    };

    const createAvatar = async (req) => {
        let avatar = req.object.get('avatar');

        if (!avatar) {
            return;
        }

        await new Parse.User()
            .set('objectId', req.object.id)
            .fetch({ useMasterKey: true });

        if (String(avatar).startsWith('data:image')) {
            let typeArr = avatar.split('data:image');
            typeArr.shift();

            typeArr = typeArr.join('').split(';base64');

            const ext = typeArr.shift().substr(1);
            let type = op.get(avatarTypes, ext, null);

            if (!type) {
                ERROR('invalid avatar image type');
                return;
            }

            type = type.replace(/\W+/g, '');
            let fileObj;

            const ID = req.object.id;

            try {
                const filename = String(`avatar-${ID}-${Date.now()}.${type}`);
                avatar = { base64: avatar.split(';base64,').pop() };
                fileObj = await new Actinium.File(filename, avatar).save();
            } catch (err) {
                ERROR(err);
                return;
            }

            if (fileObj) {
                let url = fileObj.url();
                url = String(url).includes(`${ENV.PARSE_MOUNT}/files/`)
                    ? `${ENV.PARSE_MOUNT}/files/${fileObj
                          .url()
                          .split(`${ENV.PARSE_MOUNT}/files/`)
                          .pop()}`
                    : url;

                req.object.set('avatar', url);
            }
        }
    };

    const meta = {
        update: (req) => {
            const options = CloudRunOptions(req);
            return Actinium.User.Meta.update(req.params, options);
        },
        delete: (req) => {
            const options = CloudRunOptions(req);
            return Actinium.User.Meta.delete(req.params, options);
        },
    };

    const pref = {
        update: (req) => {
            const options = MasterOptions(req);
            return Actinium.User.Pref.update(req.params, options);
        },
        delete: (req) => {
            const options = MasterOptions(req);
            return Actinium.User.Pref.delete(req.params, options);
        },
    };

    Actinium.Plugin.register(PLUGIN, true);

    const saveRoutes = async () => {
        if (typeof Actinium.Route === 'undefined') return;
        for (const route of PLUGIN_ROUTES) {
            await Actinium.Route.save(route);
        }
    };

    // Update routes on startup
    Actinium.Hook.register('start', async () => {
        if (Actinium.Plugin.isActive(PLUGIN.ID)) {
            await saveRoutes();
        }
    });

    Actinium.Hook.register('before-capability-load', () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
        Actinium.Capability.register('user-ui.view', {
            allowed: ['user', 'contributor', 'moderator'],
        });
    });

    // Update routes on plugin update
    Actinium.Hook.register('update', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            await saveRoutes();
        }
    });

    // Remove routes on deactivation
    Actinium.Hook.register('deactivate', async ({ ID }) => {
        if (ID === PLUGIN.ID) {
            for (const route of PLUGIN_ROUTES) {
                await Actinium.Route.delete(route);
            }
        }
    });

    Actinium.Cloud.afterFind(COLLECTION, afterFind);

    Actinium.Cloud.afterSave(COLLECTION, afterSave);

    Actinium.Cloud.afterDelete(COLLECTION, afterDelete);

    Actinium.Cloud.beforeLogin(beforeLogin);

    Actinium.Cloud.beforeSave(COLLECTION, beforeSave);

    Actinium.Cloud.beforeDelete(COLLECTION, beforeDelete);

    Actinium.Cloud.define(PLUGIN.ID, 'user-find', find);

    Actinium.Cloud.define(PLUGIN.ID, 'user-list', find);

    Actinium.Cloud.define(PLUGIN.ID, 'user-retrieve', retrieve);

    Actinium.Cloud.define(PLUGIN.ID, 'user-roles', roles);

    Actinium.Cloud.define(PLUGIN.ID, 'user-save', save);

    Actinium.Cloud.define(PLUGIN.ID, 'user-trash', trash);

    Actinium.Cloud.define(PLUGIN.ID, 'user-meta-update', meta.update);

    Actinium.Cloud.define(PLUGIN.ID, 'user-meta-delete', meta.delete);

    Actinium.Cloud.define(PLUGIN.ID, 'user-pref-update', pref.update);

    Actinium.Cloud.define(PLUGIN.ID, 'user-pref-delete', pref.delete);

    Actinium.Cloud.define(PLUGIN.ID, 'session-validate', validate);

    Actinium.Capability.register('acl-targets', {
        allowed: ['contributor', 'moderator', 'user'],
    });

    Actinium.Cloud.define(PLUGIN.ID, 'acl-targets', AclTargets);

    // Hooks
    Actinium.Hook.register('schema', async () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

        await Actinium.Collection.register(
            '_User',
            PLUGIN_SCHEMA.ACTIONS,
            PLUGIN_SCHEMA.SCHEMA,
            PLUGIN_SCHEMA.INDEX,
        );
    });

    Actinium.Hook.register('collection-clp', async ({ collection, CLP }) => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID) || collection !== '_User')
            return;

        // Update CLP
        Object.keys(CLP).forEach((key) => {
            if (key === 'protectedFields') return;
            op.set(CLP, [key, 'requiresAuthentication'], true);
        });
    });

    Actinium.Hook.register('start', async () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

        return Actinium.Cloud.run(
            'acl-targets',
            { cache: true },
            { useMasterKey: true },
        );
    });

    Actinium.Hook.register('warning', async () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

        return Actinium.User.init();
    });

    Actinium.Hook.register('content-trashed', async (contentObj, typeObj) => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

        const user = op.has(contentObj, 'user')
            ? await Actinium.User.retrieve({
                  objectId: contentObj.user.objectId,
              })
            : false;

        if (!user) return;

        const key = ['content', typeObj.objectId, contentObj.objectId];
        Actinium.User.Meta.delete(
            { objectId: user.objectId, keys: key.join('.') },
            MasterOptions(),
        );
    });

    Actinium.Hook.register(
        'user-before-save',
        (req) => {
            if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
            return createAvatar(req);
        },
        0,
    );

    Actinium.Hook.register(
        'user-after-save',
        async () => {
            if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
            Actinium.Cloud.run(
                'acl-targets',
                { cache: true },
                { useMasterKey: true },
            );
        },
        0,
    );

    Actinium.Hook.register(
        'user-after-save',
        async (req) => {
            if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

            // set acl value
            let acl = req.object.getACL();
            if (!acl) {
                const roles = Actinium.Roles.get();

                acl = new Parse.ACL(req.object);

                const expectedRoles = ['super-admin', 'administrator'];
                expectedRoles
                    .filter((role) => op.has(roles, role))
                    .forEach((role) => {
                        acl.setRoleWriteAccess(role, true);
                    });

                req.object.setACL(acl);

                return req.object.save(null, { useMasterKey: true });
            }
        },
        0,
    );
};

export default MOD();

/**
 * @api {Cloud} user-find user-find
 * @apiVersion 3.0.5
 * @apiGroup Cloud
 * @apiName user-find
 * @apiDescription Find a user. Triggers the `user-before-find` hook.
 * @apiParam {String} objectId Search by the objectId field.
 * @apiParam {String} username Search by the username field.
 * @apiParam {String} email Search by the email field.
 * @apiParam {Number} [page=1] The results page.
 * @apiParam {Number} [limit=1000] The number of results per page.
 * @apiExample Example usage:
Actinium.Cloud.run('user-find', { objectId: 'HrIE319Ddx' });
 */

/**
 * @api {Cloud} user-save user-save
 * @apiVersion 3.0.5
 * @apiGroup Cloud
 * @apiName user-save
 * @apiDescription Save a `Parse.User` object. If the user does not exist, it will be created. The following parameters are default. You can supply additional parameters that will alter the User collection. Triggers the `user-before-save` and `user-after-save` hooks.
 * @apiParam {String} objectId The unique objectId. Required when updating a user.
 * @apiParam {String} username The unique username.
 * @apiParam {String} email The unique email address.
 * @apiParam {String} password The user password used when signing in.
 * @apiParam {String} [role] The user role. Used when determining access to certain features.
 * @apiParam {String} [fname] The user's first name.
 * @apiParam {String} [lname] The user's last name.
 * @apiParam {String} [avatar] The url to the user's profile picture. If the avatar value is a base64 encoded string, a new Actinium.File object will be created and the Actinium.File.url() value will be used as the avatar url.
 * @apiExample Example usage:
Actinium.Cloud.run('user-save', {
    username: 'FalconPilot',
    email: 'hansoff@falcon.net',
    password: 'Gr33d0Sh0tF!rst',
    role: 'administrator',
    fname: 'Han',
    lname: 'Solo',
    avatar: 'https://media.giphy.com/media/3ornjSL2sBcPflIDiU/giphy.gif'
});
 */

/**
 * @api {Cloud} acl-targets acl-targets
 * @apiVersion 3.1.7
 * @apiGroup Cloud
 * @apiName acl-targets
 * @apiDescription Get a list of roles and users that can be used for deriving an ACL object.
 * @apiParam {String} search You can search by a multitude of things such as the role name, role label, username, user first name, user last name, and user email.
 * @apiParam {Boolean} [cache] Cache the results of the query. You cannot supply a search value. The master key is used when searching cached data so beware that you may get results that are outside of the user's level.
 * @apiParam {Boolean} [fresh] Force a search of the database instead of cached values.
 * @apiExample Example usage:
// Get all ACL targets and cache the results
Actinium.Cloud.run('acl-targets', { cache: true });

// Get a specific role
Actinium.Cloud.run('acl-targets', { search: 'super-admin' });

// Search a user from the database
Actinium.Cloud.run('acl-targets', { search: 'han', fresh: true });
 */
