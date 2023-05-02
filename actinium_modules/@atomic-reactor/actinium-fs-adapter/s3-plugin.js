import fs from 'fs-extra';
import path from 'node:path';
import op from 'object-path';
import express from 'express';
import S3Adapter from '@parse/s3-files-adapter';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const PLUGIN = {
        ID: 'S3Adapter',
        name: 'Actinium S3 Adapter plugin.',
        description:
            'Actinium S3 file adapter plugin, used to allow runtime change of underlying Parse file adapter to allow AWS S3 Storage or Digital Ocean Spaces.',
        order: Actinium.Enums.priority.high,
        version: {
            actinium: op.get(pkg, 'actinium.version', '>5.0.0'),
            plugin: op.get(pkg, 'version'),
        },
        meta: {
            group: 'FilesAdapter',
            builtIn: true,
            settings: true,
        },
    };

    const _addStaticAssets = plugin => {
        op.set(
            plugin,
            'meta.assets.admin.logo',
            '/plugin-assets/S3Adapter/add-files.svg',
        );
        op.set(
            plugin,
            'meta.assets.admin.script',
            '/plugin-assets/S3Adapter/s3-adapter.js',
        );
        op.set(
            plugin,
            'meta.assets.admin.style',
            '/plugin-assets/S3Adapter/s3-adapter-plugin.css',
        );
    };

    _addStaticAssets(PLUGIN);

    Actinium.FilesAdapter.register(PLUGIN, async config => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

        const settings = await Actinium.Setting.get('S3Adapter', {});
        
        return new S3Adapter(settings);
    });

    Actinium.Hook.register('plugin-assets-middleware', async app => {
        const router = express.Router();
        router.use(
            `/${PLUGIN.ID}`,
            express.static(path.resolve(__dirname, 'plugin-assets')),
        );
        app.use(router);
    });
};

export default MOD();
