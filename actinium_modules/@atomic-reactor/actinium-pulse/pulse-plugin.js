import fs from 'node:fs';
import moment from 'moment';
import op from 'object-path';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const COLLECTION = 'Pulse';

    const PLUGIN = {
        ID: COLLECTION,
        description:
            'Pulse plugin used to manage cron jobs via the Actinium.Pulse API',
        name: 'Pulse Plugin',
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

    const pulseStatus = req => {
        let { id, sort, status } = req.params;
        const qry = new Parse.Query(COLLECTION);

        if (id) {
            qry.equalTo('job', id);
        }

        if (status) {
            status = typeof status === 'string' ? [status] : status;
            qry.containedIn('status', status);
        }

        if (String(sort).toLowerCase() === 'ascending') {
            qry.ascending('createAt');
        } else {
            qry.descending('createdAt');
        }

        return qry.find().then(results => results.map(item => item.toJSON()));
    };

    const pulseCull = () => {
        const date = moment()
            .subtract(1, 'days')
            .toDate();
        const qry = new Parse.Query(COLLECTION);
        qry.lessThan('createdAt', date);
        return qry.find().then(results => {
            if (results.length > 0) {
                Parse.Object.destroyAll(results);
            }
        });
    };

    const pulseLog = req => {
        const { id, params = {}, status = 'log' } = req.params;

        if (!id) {
            return Promise.reject('id is a required parameter');
        }

        const obj = new Parse.Object(COLLECTION);
        return obj.save({ job: id, params, status }).catch(() => {});
    };

    Actinium.Plugin.register(PLUGIN, true);

    Actinium.Cloud.define(PLUGIN.ID, 'actinium-pulse-log', pulseLog);

    Actinium.Cloud.define(PLUGIN.ID, 'actinium-pulse-status', pulseStatus);

    Actinium.Cloud.afterSave(COLLECTION, pulseCull);

    Actinium.Hook.register('start', () => {
        if (Actinium.Plugin.isActive(PLUGIN.ID)) {
            Actinium.Pulse.init();
        }
    });
};

export default MOD();
