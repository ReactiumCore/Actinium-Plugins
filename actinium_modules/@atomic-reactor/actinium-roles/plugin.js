import fs from 'node:fs';
import _ from 'underscore';
import op from 'object-path';
import SDK from '@atomic-reactor/actinium-core/lib/roles.js';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = async () => {
    const { CloudRunOptions } = Actinium.Utils;

    const COLLECTION = Parse.Role;

    const PLUGIN = {
        ID: 'Roles',
        description: 'Roles plugin used to manage user roles & capabilities.',
        name: 'Roles Plugin',
        order: 0,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
            plugin: op.get(pkg, 'version'),
        },
        meta: {
            group: 'core',
            builtIn: true,
        },
    };

    const capabilities = [
        '_Role.create',
        '_Role.retrieve',
        '_Role.update',
        '_Role.delete',
        '_Role.addField',
    ];

    capabilities.forEach((cap) =>
        Actinium.Capability.register(cap, {}, Actinium.Enums.priority.highest),
    );

    Actinium.Collection.register('_Role', {
        create: false,
        retrieve: true,
        update: false,
        delete: false,
        addField: false,
    });

    const defaultRoleACL = () => {
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(true);
        acl.setPublicWriteAccess(true);
        return acl;
    };

    const addRoles = (req, roleArray, ACL) => {
        roleArray =
            !Array.isArray(roleArray) && _.isObject(roleArray)
                ? [roleArray]
                : roleArray;

        if (!Array.isArray(roleArray)) {
            return Promise.reject('Invalid role array');
        }

        return Parse.Object.saveAll(
            roleArray.map(({ label, level, name }) =>
                new Parse.Role(name, ACL || defaultRoleACL())
                    .set('label', label)
                    .set('level', level),
            ),
            CloudRunOptions(req),
        ).then((roles) => {
            roles = roles.map((role) => {
                const { name } = role.toJSON();
                const roleData = _.findWhere(ENV.ROLES, { name }) || {};

                if (op.has(roleData, 'roles')) {
                    const related = roles.filter((r) =>
                        roleData.roles.includes(r.get('name')),
                    );
                    role.getRoles().add(related);
                }

                if (op.has(roleData, 'acl')) {
                    ACL = ACL || defaultRoleACL();
                    let newACL = new Parse.ACL(ACL.toJSON());
                    roles.forEach((r) => {
                        if (roleData.acl.includes(r.get('name'))) {
                            newACL.setPublicWriteAccess(false);
                            newACL.setRoleWriteAccess(r, true);
                        }
                    });
                    role.setACL(newACL);
                }

                return role;
            });

            return Parse.Object.saveAll(roles, CloudRunOptions(req));
        });
    };

    const create = async (req) => {
        const { ACL, roleArray = [] } = req.params;
        await addRoles(req, roleArray, ACL);
        return SDK.list(req);
    };

    const User = {
        add: async (req) => {
            const { role, user } = req.params;
            const opts = CloudRunOptions(req);

            let roleObj = await new Parse.Query(COLLECTION)
                .equalTo('name', role)
                .first(opts);

            if (!roleObj) {
                return Promise.reject('invalid role');
            }

            const userObj = await new Parse.Query(Parse.User)
                .equalTo('objectId', user)
                .first(opts);

            if (!userObj) {
                return Promise.reject('invalid user');
            }

            roleObj.getUsers().add(userObj);

            roleObj = await roleObj.save(null, opts);

            return SDK.list(req);
        },

        remove: async (req) => {
            const { role, user } = req.params;
            const opts = CloudRunOptions(req);

            let roleObj = await new Parse.Query(Parse.Role)
                .equalTo('name', role)
                .first(opts);

            if (!roleObj) {
                return Promise.reject('invalid role');
            }

            const userObj = await new Parse.Query(Parse.User)
                .equalTo('objectId', user)
                .first(opts);

            if (!userObj) {
                return Promise.reject('invalid user');
            }

            roleObj.getUsers().remove(userObj);

            roleObj = await roleObj.save(null, opts);

            return SDK.list(req);
        },

        get: (req) => Promise.resolve(SDK.User.get(req.params.search)),
    };

    const get = (req) => Promise.resolve(SDK.get(req.params.search));

    const remove = async (req) => {
        const { role } = req.params;
        const opts = CloudRunOptions(req);

        const roleObj = new Parse.Query(COLLECTION)
            .equalTo('name', role)
            .first(opts);

        if (!roleObj) {
            return SDK.list(req);
        }

        await roleObj.destroy(opts);

        return SDK.list(req);
    };

    const afterSave = async () => {
        await SDK.list({ useMasterKey: true });

        await Actinium.Cloud.run(
            'acl-targets',
            { cache: true },
            { useMasterKey: true },
        );
    };

    const beforeDelete = (req) => {
        const { name } = req.object.toJSON();

        if (name === 'anonymous' && !req.master) {
            throw new Error(
                `The ${name} role is protected and should not be deleted.`,
            );
        }
    };

    const beforeSave = (req) => {
        const { name } = req.object.toJSON();

        if (name === 'anonymous' && !req.master && !req.object.isNew()) {
            throw new Error(
                `The ${name} role is protected and should not be edited.`,
            );
        }
    };

    Actinium.Plugin.register(PLUGIN, true);

    Actinium.Cloud.define(PLUGIN.ID, 'role-create', create);

    Actinium.Cloud.define(PLUGIN.ID, 'role-remove', remove);

    Actinium.Cloud.define(PLUGIN.ID, 'role-user-add', User.add);

    Actinium.Cloud.define(PLUGIN.ID, 'role-user-remove', User.remove);

    Actinium.Cloud.define(PLUGIN.ID, 'role-user-get', User.get);

    Actinium.Cloud.define(PLUGIN.ID, 'role', get);

    Actinium.Cloud.define(PLUGIN.ID, 'roles', SDK.list);

    Actinium.Cloud.beforeDelete(COLLECTION, beforeDelete);

    Actinium.Cloud.beforeSave(COLLECTION, beforeSave);

    Actinium.Cloud.afterSave(COLLECTION, afterSave);
};

export default MOD();

/**
 * @api {Cloud} roles roles
 * @apiVersion 3.0.5
 * @apiGroup Cloud
 * @apiName roles
 * @apiDescription Get the list of roles.
 * @apiParam {Mixed} search The role ID, level, or name.
 * @apiExample Example Usage:
Actinium.Cloud.run('roles', { search: 'super-admin' });
 */

/**
 * @api {Cloud} role role
 * @apiVersion 3.0.5
 * @apiGroup Cloud
 * @apiName role
 * @apiDescription Get a role.
 * @apiParam {Mixed} search The role ID, level, or name.
 * @apiExample Example Usage:
Actinium.Cloud.run('role', { search: 'super-admin' });
 * @apiExample Returns
{
    "super-admin": {
        "name": "super-admin",
        "label": "Super Administrator",
        "level": 10000,
        "users": {
            "HrIE319DdZ": {
                "avatar": "https://media.licdn.com/dms/image/C4E03AQED89TDXv9FgA/profile-displayphoto-shrink_200_200/0?e=1578528000&v=beta&t=As6LzG8uZNA2eqq6KcrEAzfxhtRJxmSRTMZEw-nss7A",
                "objectId": "HrIE319DdZ",
                "username": "cam"
            }
        },
        "roles": {
            "6CX7sAaV1S": {
                "label": "Standard User",
                "level": 1,
                "name": "user",
                "objectId": "6CX7sAaV1S"
            },
            "VHFAoFXSTz": {
                "label": "Moderator",
                "level": 100,
                "name": "moderator",
                "objectId": "VHFAoFXSTz"
            },
            "XF7ByHfaEe": {
                "label": "Contributor",
                "level": 10,
                "name": "contributor",
                "objectId": "XF7ByHfaEe"
            },
            "kDIUBqCNXW": {
                "label": "Administrator",
                "level": 1000,
                "name": "administrator",
                "objectId": "kDIUBqCNXW"
            }
        },
        "objectId": "Lxank79qjd"
    }
}
 */
