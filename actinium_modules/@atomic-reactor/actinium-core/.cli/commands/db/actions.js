export default (spinner) => {
    let env, fname, pkg;

    const { _, chalk, fs, path, op } = arcli;
    const { cwd } = arcli.props;

    const message = (text) => {
        if (spinner) {
            spinner.text = text;
        }
    };

    return {
        init: ({ params, props }) => {
            fname =
                op.get(params, 'remote', false) === true
                    ? 'env.remote.json'
                    : 'env.json';

            const cwd = op.get(props, 'cwd');
            env = path.normalize(
                _.compact([cwd, 'src', fname])
                    .join('/')
                    .replace(/\\/g, '/')
                    .replace(/\//g, path.sep),
            );
        },
        env: async () => {
            message(`Fetching ${chalk.cyan(fname)}...`);
            pkg = fs.readJsonSync(env);
        },
        update: ({ params }) => {
            message(`Updating ${chalk.cyan(fname)}...`);
            const { url } = params;

            op.set(pkg, 'DATABASE_URI', url);

            if (op.get(params, 'dev')) {
                fname = 'env.dev.json';
                env = path.normalize(
                    _.compact([cwd, 'src', fname])
                        .join('/')
                        .replace(/\\/g, '/')
                        .replace(/\//g, path.sep),
                );
            }

            fs.writeFileSync(env, JSON.stringify(pkg, null, 2), 'utf8');
        },
    };
};
