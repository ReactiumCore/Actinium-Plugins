import _ from 'underscore';
import chalk from 'chalk';
import op from 'object-path';
import { v4 as uuid } from 'uuid';

const COLLECTION = '_User';
const COLLECTION_ROLE = '_Role';
const COLLECTION_META = 'User_meta';
const COLLECTION_PREF = 'User_pref';

const ENUMS = {
    CACHE: 90000,
    defaultSchema: [
        'authData',
        'createdAt',
        'emailVerified',
        'objectId',
        'updatedAt',
        'uuid',
        'username',
        'password',
        'email',
        'ACL',
    ],
    protectedSchema: [],
};

/**
 * @api {Object} Actinium.User User
 * @apiGroup Actinium
 * @apiVersion 3.0.3
 * @apiDescription Set of functions to interact with the User collection.
 */
class User extends Parse.User {}

User.ENUMS = ENUMS;

/**
 * @api {Asynchronous} Actinium.User.currentUser(options) User.currentUser()
 * @apiGroup Actinium
 * @apiName User.currentUser
 * @apiDescription Get the current user from the options object.
 * @apiParam {Object} options Parse options object containing a `sessionToken` property.
 * @apiParam {Boolean} [serialize=false] Whether to serialize the response.
 * @apiExample Usage:
const currentUser = await Actinium.User.currentUser({ sessionToken: 'alketjaTelB23tjalejtljgvae' });
 */
User.currentUser = async (options, toObject = false) => {
    const response = op.has(options, 'sessionToken')
        ? await Actinium.Utils.UserFromSession(options.sessionToken)
        : undefined;

    return toObject === true && response
        ? Actinium.Utils.serialize(response)
        : response;
};

/**
 * @api {Asynchronous} Actinium.User.init() User.init()
 * @apiGroup Actinium
 * @apiName User.init
 * @apiDescription Create the initial `Parse.User` object as a Super Admin if there are no users found in the User collection.
 */
User.init = async () => {
    const options = { useMasterKey: true };

    // check the User collection for objects
    let qry = new Actinium.Query(COLLECTION);
    const results = await qry.find(options);

    if (results.length > 0) return;

    const password = uuid().substr(0, 8);
    const params = {
        username: 'admin',
        password,
        confirm: password,
        email: 'admin@reactium.io',
        uuid: uuid(),
        role: 'super-admin',
    };

    const adminUser = await User.save(params, options);

    if (adminUser) {
        WARN('');
        WARN(
            chalk.cyan.bold('Warning:'),
            'The default Super Admin user has been created:',
        );
        WARN(' ', 'Username' + chalk.cyan(':'), chalk.magenta(params.username));
        WARN(' ', 'Password' + chalk.cyan(':'), chalk.magenta(password));
        WARN(' ', 'Be sure to change this password!');
    }

    return adminUser;
};

/**
 * @api {Asynchronous} Actinium.User.list(params,options) User.list()
 * @apiGroup Actinium
 * @apiName User.list
 * @apiDescription Retrieve a list of `Parse.User` objects.
 * @apiParam {Object} params Query parameters.
 * @apiParam {Object} options Parse cloud options object.
 * @apiParam (params) {String} [role] Filter the results to the specified `Parse.Role` name.
 * @apiParam (params) {String} [search] Search using logical `or`. The query will RegExp compare to the default fields: `username`, `email`, `fname`, `lname`.

_Note:_ You can add or remove fields via the `user-search-fields` hook.
 * @apiParam (params) {Mixed} [objectId] `{String|Array}` Search for a specific objectId or array of objectIds.

 _Note:_ If `search` is specified, this value is ignored.
 * @apiParam (params) {Mixed} [email] `{String|Array}` Search for a specific email address or array of email addresses.

 _Note:_ If `search` is specified, this value is ignored.
 * @apiParam (params) {Mixed} [username] `{String|Array}` Search for a specific username or array of usernames.

 _Note:_ If `search` is specified, this value is ignored.
 * @apiParam (params) {Boolean} [optimize=false] If the count of the results is less than or equal to 1000, all objects will be returned. The page number will be set to 1 and the number of pages will also be 1.
 * @apiParam (params) {Boolean} [refresh=false] By default the results are cached for 90 seconds. You can flush the cache with this parameter.
 * @apiParam (params) {String} [indexBy] Index the results by the specified field and return them as an Object.
 * @apiParam (params) {String} [order] Order the results `ascending` or `descending`.
 * @apiParam (params) {String} [orderBy='username'] Order the results by the specified field.
 * @apiParam (params) {Number} [page=1] The page number of results to return.
 * @apiParam (params) {Number} [limit=20] The number of results to return per page.

 * @apiParam (hooks) {Hook} user-list-search-fields Mutate the fields used when searching or exact match lookups.
```
Arguments: fields:Array, params, options
```
 * @apiParam (hooks) {Hook} user-list-query Mutate the `Actinium.Query` object.

```
Arguments: query:Actinium.Query, params, options
```
 * @apiParam (hooks) {Hook} user-list-response Mutate the response object before it is returned.

```
Arguments: response:Object, params, options
```
 */
User.list = async (params, options) => {
    let page = Math.max(op.get(params, 'page', 1), 1);
    let limit = Math.min(op.get(params, 'limit', 20), 1000);
    const role = op.get(params, 'role');
    const search = op.get(params, 'search');
    const optimize = op.get(params, 'optimize', false);
    const refresh = op.get(params, 'refresh', false);
    const indexBy = op.get(params, 'indexBy');
    const outputType = String(
        op.get(params, 'outputType', 'JSON'),
    ).toUpperCase();
    const orderBy = op.get(params, 'orderBy', ['fname', 'lname']);
    const orders = ['ascending', 'descending'];
    let order = String(op.get(params, 'order', 'ascending')).toLowerCase();
    order = !orders.includes(order) ? 'ascending' : order;

    let qry = new Actinium.Query(COLLECTION);

    const roleObj = role
        ? await new Actinium.Query(COLLECTION_ROLE)
              .equalTo('name', role)
              .first()
        : undefined;

    let fields = op.get(params, 'fieldsHooked', [
        'username',
        'email',
        'fname',
        'lname',
    ]);

    if (!op.has(params, 'fieldsHooked')) {
        await Actinium.Hook.run(
            'user-list-search-fields',
            fields,
            params,
            options,
        );
    }

    if (search) {
        const regex = new RegExp(search, 'gi');
        const queries = fields.map((fld) => {
            const nqry = roleObj
                ? roleObj.relation('users').query()
                : new Actinium.Query(COLLECTION);

            return nqry.matches(fld, regex);
        });

        qry = Actinium.Query.or(...queries);
    }

    if (!search) {
        if (roleObj) {
            qry = roleObj.relation('users').query();
        }

        fields.forEach((fld) => {
            const val = op.get(params, fld);
            if (val) qry.containedIn(fld, _.flatten([val]));
        });
    }

    const count = await qry.count(options);

    if (optimize && count <= 1000) {
        page = 1;
        limit = 1000;
    }

    let response;

    // Cached results
    /*
    const cacheKey = [
        'users',
        Buffer.from(
            _.compact([
                limit,
                page,
                order,
                orderBy,
                indexBy,
                role,
                search,
                _.compact(fields.map(fld => op.get(params, fld))).join('_'),
            ]).join('_'),
        ).toString('base64'),
    ];

    if (refresh === true) Actinium.Cache.del('users');

    response = Actinium.Cache.get(cacheKey);
    if (response && !refresh) {
        await Actinium.Hook.run(
            'user-list-response',
            response,
            params,
            options,
        );
        return response;
    }
    */

    const skip = page * limit - limit;

    qry.limit(limit).skip(skip);

    if (order === 'ascending') {
        qry.addAscending(orderBy);
    } else {
        qry.addDescending(orderBy);
    }

    await Actinium.Hook.run('user-list-query', qry, params, options);

    const pages = Math.max(Math.ceil(count / limit), 1);
    const next = page + 1 <= pages ? page + 1 : null;
    const prev = page - 1 > 0 && page <= pages ? page - 1 : null;
    let results = await qry.find(options);
    results =
        outputType === 'JSON'
            ? results.map((item) => Actinium.Utils.serialize(item))
            : results;

    response = {
        count,
        next,
        page,
        pages,
        prev,
        limit,
        order,
        orderBy,
        indexBy,
        search,
        results,
    };

    await Actinium.Hook.run('user-list-response', response, params, options);

    if (indexBy) {
        op.set(response, 'results', _.indexBy(response.results, indexBy));
    }

    // Actinium.Cache.set(cacheKey, response, ENUMS.CACHE);

    return response;
};

/**
 * @api {Asynchronous} Actinium.User.retrieve(params,options) User.retrieve()
 * @apiGroup Actinium
 * @apiName User.retrieve
 * @apiDescription Retrieve a single `Parse.User` object.

 Search parameters or limited to exact match look up fields specified by the
 `user-retrieve-search-fields` hook. The order in which the fields are defined
 will also apply to their hierachy when weighting which field to search by when
 more than one param is supplied.

 Defaults: `objectId`, `username`, `email`

 _Note:_ User.list() hooks will be run with the exception of `user-retrieve-search-fields` running in place of `user-list-search-fields`.
 * @apiParam {Object} params Query parameters. See [User.list()](#api-Actinium-User_list) for more details.
 * @apiParam {Object} options Parse cloud options object.
 * @apiParam (params) {String} [objectId] Retrieve by the objectId field.
 * @apiParam (params) {String} [username] Retrieve by the username field.
 * @apiParam (params) {String} [email] Retrieve by the email address field.
 * @apiParam (hooks) {Hook} user-retrieve-search-fields Mutate the search fields.
```
Arguments: fields:Object, params, options
```
 * @apiParam (hooks) {Hook} user-retrieve-response Mutate the `Parse.User` object before it is returned.
```
Arguments: user:Object, params, options
```
 */
User.retrieve = async (params, options) => {
    params.outputType = String(
        op.get(params, 'outputType', 'JSON'),
    ).toUpperCase();

    // cached?
    if (op.get(params, 'objectId') && !op.get(params, 'refresh')) {
        const cached = Actinium.Cache.get(
            `UserRetrieve${params.outputType}${params.objectId}`,
        );

        if (cached) return cached;
    }

    const qry = new Actinium.Query(COLLECTION);

    const fields = {
        equalTo: ['objectId', 'uuid', 'email', 'username'],
    };

    await Actinium.Hook.run(
        'user-retrieve-search-fields',
        fields,
        params,
        options,
    );

    Object.entries(fields).forEach(([func, flds]) => {
        Object.entries(params).forEach(([k, v]) => {
            if (!flds.includes(k)) return;
            qry[func](k, v);
        });
    });

    let user = await qry.first(options);

    if (!user) return;

    const ID = user.id;

    const meta = await Actinium.User.Meta.retrieve({ user }, options);

    await Actinium.Hook.run('user-retrieve-response', user, params, options);

    if (params.outputType === 'JSON') {
        user = Actinium.Utils.serialize(user);
        user.meta = meta ? meta.toJSON() : {};

        const excludes = [
            'meta.user',
            'meta.createdAt',
            'meta.updatedAt',
            'meta.ACL',
            'createdAt',
            'updatedAt',
            'ACL',
        ];
        excludes.forEach((k) => op.del(user, k));
    } else {
        user.meta = meta;
    }

    user.timestamp = Date.now();

    Actinium.Cache.set(`UserRetrieve${params.outputType}${ID}`, user, 10000);

    return user;
};

/**
 * @api {Asynchronous} Actinium.User.save(params,options) User.save()
 * @apiGroup Actinium
 * @apiName User.save
 * @apiDescription Save a `Parse.User` object.
 * @apiParam {Object} params Key value pairs to apply to the `Parse.User` object.

 _Note:_ Any additional key value pairs will be added to the user object as a new column.

 * @apiParam {Object} options Parse cloud options object.
 * @apiParam (params) {String} username The unique username used when signing in.
 * @apiParam (params) {String} email The email address to associate with the user account.
 * @apiParam (params) {String} password The password used when signing in.
 * @apiParam (params) {String} [role] The `Parse.Role` name to add the user to.
 * @apiParam (hooks) {Hook} user-before-save Mutate the `Parse.User` object before save is complete.

```
Arguments:  req:Object:Parse.User
```
 * @apiParam (hooks) {Hook} user-after-save Take action after the `Parse.User` object has been saved.
```
Arguments: req:Object:Parse.User
```
 */
User.save = async (params, options) => {
    // Get the role
    const roles = _.chain([op.get(params, 'role'), op.get(params, 'roles')])
        .flatten()
        .compact()
        .value();

    // Remove role from params
    op.del(params, 'role');
    op.del(params, 'roles');

    // check password
    if (op.has(params, 'password')) {
        if (params.password === null) {
            op.del(params, 'password');
        } else if (!params.confirm || params.password !== params.confirm) {
            return Promise.reject(new Error('passwords do not match'));
        }
    }

    // remove the confirm value
    op.del(params, 'confirm');

    // delete username if not new
    if (op.has(params, 'objectId')) op.del(params, 'username');

    // Create the user object
    const userObj = new Parse.Object(COLLECTION);

    let schema = _.chain(User.ENUMS.defaultSchema)
        .without('createdAt', 'updatedAt')
        .clone()
        .value();

    await Actinium.Hook.run('user-save-schema', schema);

    // Apply parameters to the userObj
    Object.entries(params).forEach(([key, value]) => {
        if (!schema.includes(key)) return;

        if (value === null || !value) {
            userObj.unset(key);
        } else {
            userObj.set(key, value);
        }
    });

    userObj.set('context', {
        ...userObj.toJSON(),
        ...params,
    });

    // Save the user
    let user;
    try {
        user = await userObj.save(null, options);
    } catch (err) {
        ERROR('User.save() -> Error', err.message);
        console.log(params);
        console.log(options);
        throw err;
    }

    // Apply the role
    try {
        if (roles && user) {
            const roleActions = [];
            for (const role of roles) {
                roleActions.push(
                    Parse.Cloud.run(
                        'role-user-add',
                        { user: user.id, role },
                        options,
                    ).catch((err) => {
                        console.log('user.save() role add', err.message);
                    }),
                );
            }

            await Promise.all(roleActions);
        }
    } catch (err) {
        ERROR(err);
    }

    Actinium.Cache.del('users');

    user = Actinium.Utils.serialize(user);

    const current = await User.currentUser(options);

    if (Actinium.Utils.isSDK('Recycle')) {
        await Actinium.Recycle.revision(
            {
                collection: COLLECTION,
                object: { ...user, password: null },
                user: current,
            },
            { useMasterKey: true },
        );
    }

    return User.retrieve({ objectId: user.objectId }, options);
};

/**
 * @api {Asynchronous} Actinium.User.trash(params,options) User.trash()
 * @apiGroup Actinium
 * @apiName User.trash
 * @apiDescription Send a single `Parse.User` object to the recycle bin.
 * @apiParam {Object} params Object containing parameters for deleting a user.
 * @apiParam {Object} options Parse cloud options object.
 * @apiParam (params) {String} objectId The Parse.User objectId.
 * @apiParam (hooks) {Hook} user-before-delete Triggered before the `Parse.User` object is deleted.

```
Arguments: req:Object:Parse.User
```
 * @apiParam (hooks) {Hook} user-after-delete Triggered after the `Parse.User` object is deleted.

 ```
 Arguments: req:Object:Parse.User
 ```
 */
User.trash = async (params, options) => {
    const objectId = op.get(params, 'objectId');
    if (!objectId) return new Error('objectId is a required parameter');

    const userObj = await new Actinium.Query(COLLECTION)
        .equalTo('objectId', objectId)
        .first();

    if (!userObj) return;

    if (Actinium.Utils.isSDK('Recycle')) {
        const current = await User.currentUser(options);
        await Actinium.Recycle.trash(
            {
                collection: COLLECTION,
                object: userObj.toJSON(),
                user: current,
            },
            options,
        );
    }

    await userObj.destroy(options);
};

class UserMeta {
    constructor(collection) {
        this.__collection = collection || COLLECTION_META;
    }

    get collection() {
        return this.__collection;
    }

    async retrieve({ user }, options) {
        if (_.isString(user)) {
            const id = user;
            user = new Actinium.User(COLLECTION);
            user.id = id;
        }

        options = options || { useMasterKey: true };
        const qry = new Actinium.Query(this.collection);
        qry.equalTo('user', user);
        return qry.first(options);
    }

    /**
     * @api {Asynchronous} Actinium.User.Meta.update(params,options) User.Meta.update()
     * @apiGroup Actinium
     * @apiName User.Meta.update
     * @apiDescription Mutate the Parse.User.meta object.
     * @apiParam {Object} params Object containing parameters for retrieving a user and the key value pair to apply to the user meta object.
     * @apiParam {Object} options Parse cloud options object.
     * @apiParam (params) {String} [objectId] Look up the user object by the objectId field. See [User.retrieve()](#api-Actinium-User_retrieve).
     * @apiParam (params) {String} [username] Look up the user object by the username field. See [User.retrieve()](#api-Actinium-User_retrieve).
     * @apiParam (params) {String} [email] Look up the user object by the email field. See [User.retrieve()](#api-Actinium-User_retrieve).
     * @apiParam (hooks) {Hook} user-sensative-fields Mutate the list of sensative (non-public) fields.
        ```
        Arguments: fields:Array, params, options
        ```
     * @apiParam (hooks) {Hook} user-before-meta-save Triggered before the user update is executed.
        ```
        Arguments: meta:Object, prev:Object, user:Parse.User, params, options
        ```
     * @apiParam (hooks) {Hook} user-meta-save-response Triggered before the updated user object is returned.
        ```
        Arguments: meta:Object, prev:Object, user:Parse.User, params, options
        ```
     * @apiExample Usage
        Actinium.User.Meta.update({ objectId: 'aetlkq25', test: 123, out: 456 });
     */
    async update(params, options) {
        options = options || { useMasterKey: true };

        params = _.clone(params);

        if (_.isString(op.get(params, 'user'))) {
            op.set(params, 'objectId', params.user);
            op.del(params, 'user');
        }

        const user = await User.save(
            { ...params, outputType: 'OBJECT' },
            options,
        );

        return this.retrieve({ user }, options);
    }

    async delete(params, options) {
        options = options || { useMasterKey: true };

        params = _.clone(params);

        const keys = _.chain([op.get(params, 'keys', [])])
            .flatten()
            .compact()
            .value();

        if (keys.length < 1) return;

        if (_.isString(op.get(params, 'user'))) {
            op.set(params, 'objectId', params.user);
            op.del(params, 'user');
        }

        const user = await User.save(
            { ...params, outputType: 'OBJECT' },
            options,
        );

        const obj = await this.retrieve({ user }, options);

        const excluded = ['createdAt', 'updatedAt', 'objectId', 'ACL', 'user'];

        keys.filter((key) => !excluded.includes(key)).forEach((key) =>
            obj.unset(key),
        );

        return obj.save(null, options);
    }
}

class UserPref extends UserMeta {
    constructor(collection) {
        super();
        this.__collection = collection || COLLECTION_PREF;
    }
}

User.Meta = new UserMeta();
User.Pref = new UserPref();

export default User;
