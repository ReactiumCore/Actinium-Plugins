import fs from 'fs-extra';
import path from 'node:path';
import op from 'object-path';
import FSFilesAdapter from '@parse/fs-files-adapter';

const pkg = JSON.parse(fs.readFileSync('package.json'));

const MOD = () => {
    const PLUGIN = {
        ID: 'FSFileAdapter',
        name: 'Actinium File Adapter plugin.',
        description:
            'Actinium file adapter plugin, used to allow files to be stored on the filesystem.',
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

    FSFilesAdapter.prototype._getLocalFilePath = function (filename) {
        const applicationDir = this._getApplicationDir();
        const filePath = path.resolve(applicationDir, filename);
        fs.ensureDirSync(path.dirname(filePath));

        return filePath;
    };

    Actinium.FilesAdapter.register(PLUGIN, async (config, env) => {
        if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

        let filesSubDirectory = await Actinium.Setting.get(
            'FSFileAdapter.filesSubDirectory',
            op.get(
                config,
                'filesSubDirectory',
                op.get(env, 'PARSE_FS_FILES_SUB_DIRECTORY', 'uploads'),
            ),
        );

        filesSubDirectory = path.normalize(filesSubDirectory);
        if (filesSubDirectory[0] === path.sep) {
            filesSubDirectory = path.relative(BASE_DIR, filesSubDirectory);
        }

        return new FSFilesAdapter({
            filesSubDirectory,
        });
    });
};

export default MOD();
