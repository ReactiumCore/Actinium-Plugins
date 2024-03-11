import express from 'express';

Actinium.Middleware.register(
    'body-parser',
    (app) => {
        app.use(express.json({ limit: ENV.MAX_UPLOAD_SIZE, }));
        app.use(express.urlencoded({ extended: true, limit: ENV.MAX_UPLOAD_SIZE }));
        return Promise.resolve();
    },
    -100000,
);
