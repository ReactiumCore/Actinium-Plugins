import fs from 'fs-extra';
import _ from 'underscore';
import op from 'object-path';
import path from 'node:path';
import slugify from 'slugify';
import { v5 as uuid } from 'uuid';
import PLUGIN_SCHEMA from './schema.js';
import { dirname } from '@atomic-reactor/dirname';

const COLLECTION = 'Content';
const __dirname = dirname(import.meta.url);
const __pkg = fs.readJsonSync(path.normalize(`${__dirname}/package.json`));

const ENUMS = {
    SEARCH_LENGTH: 4,
    REQUIRED: ['title'],
    NAMESPACE:
        Event.CONTENT_NAMESPACE || '9f85eb4d-777b-4213-b039-fced11c2dbae',
    ERROR: {
        SEARCH_LENGTH: 'title paramater must be 4 characters or more',
        REQUIRED: 'is a required parameter',
    },
};

class SDK {
    constructor() {}

    get collection() {
        return COLLECTION;
    }

    get schema() {
        const s =
            _.findWhere(Array.from(PLUGIN_SCHEMA), {
                collection: this.collection,
            }) || {};
        return op.get(s, 'schema');
    }

    get version() {
        return op.get(__pkg, 'version', '0.0.1');
    }

    get exists() {
        return async ({ type, slug }, options) => {
            this.utils.assertTypeSlug(type, slug);

            options = options || { useMasterKey: true };
            const uuid = this.utils.genUUID(type, slug);
            const obj = await this.retrieve({ uuid }, options);

            return !!obj;
        };
    }

    get find() {
        return async (params, options) => {
            const qry = new Actinium.Query(this.collection);

            // uuid
            let uuids = op.get(params, 'uuid');
            uuids = this.utils.stringToArray(uuids);
            if (uuids.length > 0) qry.containedIn('uuid', uuids);

            // objectId
            let oids = op.get(params, 'objectId');
            oids = this.utils.stringToArray(oids);
            if (oids.length > 0) qry.containedIn('objectId', oids);

            // title
            let title = op.get(params, 'title');
            if (_.isString(title)) {
                this.utils.assertSearchLength(title);
                qry.matches('title', new RegExp(title));
            }

            // status
            let statuses = op.get(params, 'status');
            statuses = this.utils.stringToArray(statuses);
            statuses = statuses.map((s) => String(s).toUpperCase());
            if (statuses.length > 0) qry.containedIn('status', statuses);

            // user
            let users = op.get(params, 'user');
            users = this.utils.stringToArray(users);
            users = await Promise.all(users.map(this.utils.userFromString));
            if (users.length > 0) qry.containedIn('user', users);

            // type
            let type = await this.utils.type(op.get(params, 'type'));

            // slug
            let slugs = op.get(params, 'slug');
            slugs = this.utils.stringToArray(slugs);

            if (type) {
                if (slugs.length < 1) {
                    qry.equalTo('type', type);
                } else {
                    // type + slug convert to uuid
                    const typeMachineName = type.get('machineName');
                    slugs = slugs.map((slug) =>
                        this.utils.genUUID(typeMachineName, slug),
                    );
                    if (slugs.length > 0) qry.containedIn('uuid', slugs);
                }
            }

            await Actinium.Hook.run('content-query', {
                query: qry,
                params,
                options,
            });

            // Pagination
            const count = await qry.count(options);
            let limit = op.get(params, 'limit', 50);
            limit = Math.min(limit, 100);
            qry.limit(limit);

            const pages = Math.ceil(count / limit);

            let page = op.get(params, 'page', 1);
            page = Math.min(page, pages);
            page = Math.max(page, 1);

            const index = page * limit - limit;
            qry.skip(index);

            // Search
            const results = await qry.find(options);

            return {
                count,
                page,
                pages,
                limit,
                index,
                results,
            };
        };
    }

    get retrieve() {
        return async (params, options, create = false) => {
            options = options !== null ? options : { useMasterKey: true };

            const qry = new Actinium.Query(this.collection);

            const oid = op.get(params, 'objectId');
            const slug = op.get(params, 'slug');
            const type = op.get(params, 'type');
            let uuid = op.get(params, 'uuid');

            if (slug && type) {
                uuid = this.utils.genUUID(type, slug);
            }

            if (uuid) {
                qry.equalTo('uuid', uuid);
            } else if (oid) {
                qry.equalTo('objectId', oid);
            }

            const where = op.get(JSON.parse(JSON.stringify(qry)), 'where', {});

            const isQry = Object.keys(where).length > 0;

            const obj = isQry ? await qry.first(options) : undefined;

            return !obj && create === true
                ? new Actinium.Object(this.collection)
                : obj;
        };
    }

    get save() {
        const sanitize = (params) => {
            if (this.schema) {
                const keys = Object.keys(this.schema);

                Object.keys(params).forEach((key) => {
                    if (keys.includes(key)) return;
                    op.del(params, key);
                });
            }

            return params;
        };

        return async (params, options) => {
            // Fetch the Type object if value is a string
            let type = op.get(params, 'type');
            type = await this.utils.type(type);
            op.set(params, 'type', type);

            // Generate the slug from the title
            let slug = op.get(params, 'slug');
            const title = op.get(params, 'title');

            if (title && !slug) {
                slug = this.utils.genSlug(title);
                op.set(params, 'slug', slug);
            }

            // Generate the uuid from the type.machineName and slug
            if (type && slug) {
                op.set(
                    params,
                    'uuid',
                    this.utils.genUUID(type.get('machineName'), slug),
                );
            }

            params = sanitize(params);
            await Actinium.Hook.run('content-save-sanitize', params);

            const obj = await this.retrieve(
                { uuid: op.get(params, 'uuid') },
                null,
                true,
            );

            Object.entries(params).forEach(([k, v]) => {
                if (v === null || v === undefined) obj.unset(k);
                else obj.set(k, v);
            });

            // Save
            const saved = await obj.save(null, options);

            // Return a fetched version so we get any afterFind mutations
            return saved.fetch({ useMasterKey: true });
        };
    }

    get beforeSave() {
        const isError = (req) => () =>
            _.isArray(op.get(req.context, 'error.message'));

        const getError = (req) => () => {
            let msgs = op.get(req.context, 'error.message', []);
            msgs = _.isArray(msgs) ? msgs : [];
            return msgs.join('.\n');
        };

        const setError = (req) => (msg) => {
            let msgs = op.get(req.context, 'error.message', []);
            msgs = _.isArray(msgs) ? msgs : [];
            msgs.push(msg);

            op.set(req.context, 'error.message', msgs);
        };

        const validate = async (req) => {
            let required = op.get(req.context, 'required', []);

            if (!required.includes('title')) required.push('title');
            if (!required.includes('type')) required.push('type');

            required = _.uniq(required);

            required.forEach((key) => {
                const val = req.object.get(key);
                const type = op.get(this.schema, [key, 'type']);

                if (!val) {
                    req.context.error.set(
                        `[${key}:${type}] ${ENUMS.ERROR.REQUIRED}`,
                        {
                            key: val,
                            type,
                        },
                    );
                }
            });

            await Actinium.Hook.run('content-validate', req);
        };

        return async (req) => {
            req.context = {
                error: {
                    message: null,
                    set: setError(req),
                    get: getError(req),
                },
                isError: isError(req),
                required: ENUMS.REQUIRED,
            };

            await Actinium.Hook.run('content-before-save', req);

            // Fetch the Type object
            let type = req.object.get('type');
            type = await this.utils.type(type);

            if (!type) {
                throw new Error(`[type:String|Object] ${ENUMS.ERROR.REQUIRED}`);
            }

            req.object.set('type', type);

            // Set user value
            let user = await this.utils.userFromString(
                req.object.get('user'),
                true,
            );
            if (user) {
                req.object.set('user', user);
            } else {
                req.object.unset('user');
            }

            // Generate the ACL
            const ACL = user ? new Actinium.ACL(user) : new Actinium.ACL();
            ACL.setPublicReadAccess(true);
            ACL.setRoleReadAccess('super-admin', true);
            ACL.setRoleWriteAccess('super-admin', true);
            ACL.setRoleReadAccess('administrator', true);
            ACL.setRoleWriteAccess('administrator', true);

            req.object.setACL(ACL);

            await Actinium.Hook.run('content-acl', req);

            // Generate the status
            if (type && !req.object.get('status')) {
                const status = _.first(
                    String(
                        op.get(
                            type.toJSON(),
                            'fields.publisher.statuses',
                            'PUBLISHED',
                        ),
                    )
                        .toUpperCase()
                        .split(' ')
                        .join('')
                        .split(','),
                );

                req.object.set('status', status);
            }

            // Generate the slug from the title
            if (!req.object.get('slug')) {
                const title = req.object.get('title');
                req.object.set('slug', this.utils.genSlug(title));
            }

            // Generate the uuid from the type.machineName and slug
            if (type) {
                req.object.set(
                    'uuid',
                    this.utils.genUUID(
                        type.get('machineName'),
                        req.object.get('slug'),
                    ),
                );
            }

            // Generate the data object
            if (!req.object.get('data')) req.object.set('data', {});

            // Generate the meta object
            if (!req.object.get('meta')) req.object.set('meta', {});

            // Run the validator
            await validate(req);

            if (req.context.isError()) {
                throw new Error(req.context.error.get());
            }

            // Last chance to mutate the object before writing to db
            await Actinium.Hook.run('content-save', req);
        };
    }

    get delete() {
        return async (params, options) => {
            let { results, page, pages } = await this.find(params, options);

            const items = [];

            while (page <= pages) {
                results.forEach((item) => {
                    item.set('status', 'DELETE');
                    item.saveEventually(options);
                    items.push(item);
                });

                page++;

                const next = await this.find({ ...params, page }, options);

                results = next.results;
            }

            return { items };
        };
    }

    get purge() {
        return async (params, options) => {
            op.set(params, 'status', 'DELETE');

            let { results, page, pages } = await this.find(params, options);

            const items = [];

            while (page <= pages) {
                results.forEach((item) => {
                    item.destroyEventually(options);
                    items.push(item);
                });

                page++;

                const next = await this.find({ ...params, page }, options);

                results = next.results;
            }

            return { items };
        };
    }

    get utils() {
        return {
            assertString: (key, str) => {
                if (!_.isString(str)) {
                    throw new Error(`[${key}:String] ${ENUMS.ERROR.REQUIRED}`);
                }
            },

            assertSearchLength: (str) => {
                if (String(str).length < ENUMS.SEARCH_LENGTH) {
                    throw new Error(ENUMS.ERROR.SEARCH_LENGTH);
                }
            },

            assertTypeSlug: (type, slug) => {
                this.utils.assertString('type', type);
                this.utils.assertString('slug', slug);
            },

            genSlug: (slug) => {
                this.utils.assertString('title', slug);

                return slugify(slug, {
                    lower: true,
                    strict: true,
                });
            },

            genUUID: (type, slug) => {
                this.utils.assertTypeSlug(type, slug);
                return uuid(`${type}/${slug}`, ENUMS.NAMESPACE);
            },

            stringToArray: (str) =>
                _.chain([str]).flatten().compact().uniq().value(),

            type: async (type) => {
                if (type) {
                    if (_.isString(type)) {
                        type = await this.utils.typeFromString(
                            'machineName',
                            type,
                        );
                    } else if (_.isObject(type)) {
                        if (op.get(type, 'id')) {
                            type = await type.fetch({ useMasterKey: true });
                        } else {
                            let k, v;
                            k = !k && op.get(type, 'uuid') ? 'uuid' : k;
                            k = !k && op.get(type, 'objectId') ? 'objectId' : k;
                            k =
                                !k && op.get(type, 'machineName')
                                    ? 'machineName'
                                    : k;

                            v = op.get(type, k);

                            if (k && v) {
                                type = await this.utils.typeFromString(k, v);
                            }
                        }
                    }
                }

                return type;
            },

            typeFromString: async (key, str, options) => {
                this.utils.assertString('type', str);

                options = options || { useMasterKey: true };
                const qry = new Actinium.Query('Type');
                qry.equalTo(key, str);

                const type = await qry.first(options);

                return type ? type.fetch(options) : undefined;
            },

            userFromString: async (user, fetch = false) => {
                if (_.isString(user)) {
                    let uobj = new Actinium.Object('_User');
                    uobj.id = user;

                    if (fetch === true) {
                        uobj = await uobj.fetch({ useMasterKey: true });
                    }
                    user = uobj;
                }

                return user;
            },
        };
    }
}

Actinium.Content = Actinium.Content || new SDK();

export default new SDK();
