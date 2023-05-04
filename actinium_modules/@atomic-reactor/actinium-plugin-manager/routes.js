export default [
    {
        "route": "/admin/plugins/:id",
        "blueprint": "PluginManager",
        "meta": {
            "builtIn": true,
            "app": "admin"
        },
        "capabilities": ["plugins-ui.view"]
    },
    {
        "route": "/admin/plugins",
        "blueprint": "PluginManager",
        "meta": {
            "builtIn": true,
            "app": "admin"
        },
        "capabilities": ["plugins-ui.view"]
    }
]
