const { hooks = [], ...PLUGIN } = require('./index');

Actinium.Plugin.register(PLUGIN, true);
hooks.forEach((...hook) => Actinium.Hook.register(...hook));
