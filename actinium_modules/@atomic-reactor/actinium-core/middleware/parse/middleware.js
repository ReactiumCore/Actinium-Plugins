import op from 'object-path';
import express from 'express';
import Hook from '../../lib/hook.js';
import { ParseServer } from 'parse-server';
import ParseDashboard from 'parse-dashboard';
import FileAdapter from '../../lib/files-adapter.js';

const parseConfig = (hook) => {
    const config = {
        appId: ENV.APP_ID,
        appName: ENV.APP_NAME,
        masterKey: ENV.MASTER_KEY,
        masterKeyIps: ENV.MASTER_KEY_IPS,
        enforcePrivateUsers: false,
        sessionLength: 31536000000,
        databaseURI: ENV.DATABASE_URI,
        cloud: () => {}, // ACTINIUM_DIR + '/cloud.cjs', deprecated
        serverURL: ENV.SERVER_URI + ENV.PARSE_MOUNT,
        directAccess: ENV.PARSE_FILES_DIRECT_ACCESS,
        preserveFileName: ENV.PARSE_PRESERVE_FILENAME,
        publicServerURL: ENV.PUBLIC_SERVER_URI + ENV.PARSE_MOUNT,
        allowClientClassCreation: ENV.PARSE_ALLOW_CLIENT_CLASS_CREATION,
        maxUploadSize: ENV.MAX_UPLOAD_SIZE,
        installation: {
            duplicateDeviceTokenActionEnforceAuth: op.get(
                ENV,
                'PARSE_INSTALLATION_DEDUP_ENFORCE_AUTH',
                true,
            ),
        },
        protectedFieldsSaveResponseExempt: op.get(
            ENV,
            'PARSE_PROTECTED_FIELDS_SAVE_RESPONSE_EXEMPT',
            false,
        ),
        protectedFieldsTriggerExempt: op.get(
            ENV,
            'PARSE_PROTECTED_FIELDS_TRIGGER_EXEMPT',
            true,
        ),
        protectedFieldsOwnerExempt: op.get(
            ENV,
            'PARSE_PROTECTED_FIELDS_OWNER_EXEMPT',
            false,
        ),
        requestComplexity: {
            includeDepth: op.get(ENV, 'PARSE_REQUEST_INCLUDE_DEPTH', 10),
            includeCount: op.get(ENV, 'PARSE_REQUEST_INCLUDE_COUNT', 100),
            subqueryDepth: op.get(ENV, 'PARSE_REQUEST_SUBQUERY_DEPTH', 10),
            queryDepth: op.get(ENV, 'PARSE_REQUEST_QUERY_DEPTH', 10),
            graphQLDepth: op.get(ENV, 'PARSE_REQUEST_GRAPHQL_DEPTH', 20),
            graphQLFields: op.get(ENV, 'PARSE_REQUEST_GRAPHQL_FIELDS', 200),
            batchRequestLimit: op.get(ENV, 'PARSE_REQUEST_BATCH_LIMIT', 100),
        },
        readOnlyMasterKeyIps: op.get(ENV, 'READ_ONLY_MASTER_KEY_IPS', [
            '127.0.0.1',
            '::1',
        ]),
        pages: {
            encodePageParamHeaders: op.get(
                ENV,
                'PARSE_ENCODE_PAGE_PARAM_HEADERS',
                true,
            ),
        },
        fileUpload: {
            enableForPublic: ENV.PARSE_FILE_UPLOAD_PUBLIC,
            enableForAnonymousUser: ENV.PARSE_FILE_UPLOAD_ANONYMOUS,
            enableForAuthenticatedUser: op.get(
                ENV,
                'PARSE_FILE_UPLOAD_AUTHENTICATED',
                true,
            ),
            allowedFileUrlDomains: op.get(
                ENV,
                'PARSE_ALLOWED_FILE_URL_DOMAINS',
                [],
            ),
        },
    };

    config.filesAdapter = FileAdapter.getProxy(config);

    // rest api key
    if (op.has(ENV, 'REST_API_KEY')) {
        config['restAPIKey'] = ENV.REST_API_KEY;
    }

    // client key
    if (op.has(ENV, 'CLIENT_KEY')) {
        config['clientKey'] = ENV.CLIENT_KEY;
    }

    // javascript key
    if (op.has(ENV, 'JAVASCRIPT_KEY')) {
        config['javascriptKey'] = ENV.JAVASCRIPT_KEY;
    }

    // dotNet key
    if (op.has(ENV, 'DOTNET_KEY')) {
        config['dotNetKey'] = ENV.DOTNET_KEY;
    }

    // live query server settings
    if (ENV.LIVE_QUERY_SETTINGS) {
        config['liveQuery'] = ENV.LIVE_QUERY_SETTINGS;
    }

    // Logging
    if (ENV.LOG !== true) {
        config.loggerAdapter = null;
    }

    if (ENV.LOG_LEVEL) {
        config.logLevel = ENV.PARSE_LOG_LEVEL;
    }

    if (hook) Hook.runSync(hook, config);

    return config;
};

Actinium.Middleware.register('parse', async (app) => {
    if (ENV.NO_PARSE !== true) {
        const server = new ParseServer(parseConfig('parse-server-config'));

        const routerServer = express.Router();
        routerServer.use(ENV.PARSE_MOUNT, server.app);

        app.use(routerServer);

        await server.start();
    }

    if (ENV.PARSE_DASHBOARD === true && !ENV.NO_PARSE) {
        const {
            appId,
            appName,
            masterKey,
            masterKeyIps,
            sessionLength,
            serverURL,
            publicServerURL,
        } = parseConfig();

        const dashboardConfig = {
            trustProxy: 1,
            users: ENV.PARSE_DASHBOARD_USERS,
            apps: [
                {
                    appId,
                    appName,
                    masterKey,
                    masterKeyIps,
                    sessionLength,
                    serverURL,
                    publicServerURL,
                },
            ],
        };

        const dashboardOptions = {
            allowInsecureHTTP: ENV.PARSE_DASHBOARD_ALLOW_INSECURE_HTTP,
            cookieSessionSecret:
                'RhbhlE9ze74MALtA2UtqqZzglN2oWgQ0a7jGSZt4sY6eIXeN0yHG7my0dYpA93cl',
        };

        Hook.runSync('parse-dashboard-config', dashboardConfig);
        Hook.runSync('parse-dashboard-config-options', dashboardOptions);

        const dashboard = new ParseDashboard(dashboardConfig, dashboardOptions);

        app.use(ENV.PARSE_DASHBOARD_MOUNT, dashboard);
    }

    return Promise.resolve();
});
