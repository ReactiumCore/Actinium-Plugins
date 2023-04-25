import express from 'express';

/**
 * Simple no-privilege express routes for content
 */
const MOD = () => {
    Actinium.Middleware.register(
        'content-helper',
        (app) => {
            const router = express.Router();
            router.use('/content/:type/:id', async (req, res) => {
                const { type: machineName, id: objectId } = req.params;
                try {
                    const content = await Actinium.Content.retrieve({
                        type: {
                            machineName,
                        },
                        objectId,
                        current: true,
                        resolveRelations: true,
                    });

                    res.json(content);
                } catch (error) {
                    res.status(500).json(error);
                }
            });

            app.use(router);

            return Promise.resolve();
        },
        -10000000,
    );
};

export default MOD();
