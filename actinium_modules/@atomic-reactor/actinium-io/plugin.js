import fs from 'node:fs';
import op from 'object-path';
import { Server } from 'socket.io';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const { Registry } = Actinium.Utils;

    const PLUGIN = {
        ID: 'IO',
        description: 'Socket.io plugin',
        name: 'Socket.io Plugin',
        order: 100,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
            plugin: op.get(pkg, 'version'),
        },
        bundle: [],
        meta: {
            builtIn: true,
        },
    };

    /**
     * ----------------------------------------------------------------------------
     * Plugin registration
     * ----------------------------------------------------------------------------
     */
    Actinium.Plugin.register(PLUGIN, true);

    /**
     * ----------------------------------------------------------------------------
     * Extend Actinium SDK
     * ----------------------------------------------------------------------------
     */
    Actinium.IO = {
        clients: new Registry(
            'ioClients',
            'id',
            Actinium.Utils.Registry.MODES.CLEAN,
        ),
    };

    /**
     * ----------------------------------------------------------------------------
     * Hook registration
     * ----------------------------------------------------------------------------
     */
    Actinium.Hook.register('start', async () => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

        BOOT();
        BOOT('Attaching socket.io.');

        const socketConfig = {
            path: '/actinium.io',
            serverClient: false,
            cors: {
                origin: '*',
            },
        };

        await Actinium.Hook.run('io.config', socketConfig);

        Actinium.IO.server = new Server(Actinium.server, socketConfig);

        await Actinium.Hook.run('io.init', Actinium.IO);
    });

    Actinium.Hook.register(
        'io.init',
        (IO) => {
            IO.server.on('connection', (client) => {
                Actinium.Hook.run('io.connection', client);
            });
        },
        Actinium.Enums.priority.highest,
    );

    Actinium.Hook.register(
        'io.connection',
        (client) => {
            DEBUG(`${client.id} connecting`);

            const entry = {
                id: client.id,
                client,
            };

            Actinium.IO.clients.register(client.id, entry);

            client.on('disconnecting', () => {
                DEBUG(`${client.id} disconnecting`);
                () => Actinium.Hook.run('io.disconnecting', client);
                Actinium.IO.clients.unregister(client.id);
            });
        },
        Actinium.Enums.priority.highest,
    );
};

export default MOD();
