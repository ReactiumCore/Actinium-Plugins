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
    NAMESPACE:
        Event.CONTENT_NAMESPACE || '9f85eb4d-777b-4213-b039-fced11c2dbae',
    ERROR: {
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

            if (type && _.isString(type)) {
                type = await this.utils.typeFromMachineName(type);
                op.set(params, 'type', type);
            }

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
                required: ['title', 'type'],
            };

            await Actinium.Hook.run('content-before-save', req);

            // Fetch the Type object if value is a string
            let type = req.object.get('type');
            if (type && _.isString(type)) {
                type = await this.utils.typeFromMachineName(type);
                if (type) req.object.set('type', type);
            }

            // Fetch the entire Type object because Parse gives a lite version
            if (type) {
                type = await type.fetch({ useMasterKey: true });
            }

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
            const uuid = req.object.get('uuid');
            if (type && !uuid) {
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

    get afterSave() {
        return async (req) => {
            await Actinium.Hook.run('content-after-save', req);
        };
    }

    get exists() {
        return async (type, slug, options) => {
            this.utils.assertTypeSlug(type, slug);

            options = options || { useMasterKey: true };
            const uuid = this.utils.genUUID(type, slug);
            const obj = await this.retrieve({ uuid }, options);

            return !!obj;
        };
    }

    get list() {
        return async (params, options) => {
            const qry = new Actinium.Query();
        };
    }

    get utils() {
        return {
            assertString: (key, str) => {
                if (!_.isString(str)) {
                    throw new Error(`[${key}:String] ${ENUMS.ERROR.REQUIRED}`);
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

            typeFromMachineName: async (str, options) => {
                this.utils.assertString('type', str);

                options = options || { useMasterKey: true };
                const qry = new Actinium.Query('Type');
                qry.equalTo('machineName', str);

                return qry.first(options);
            },
        };
    }
}

Actinium.Content = Actinium.Content || new SDK();

export default new SDK();
