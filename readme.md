# Actinium Plugins

This repository is intended to be the source of the Actinium base functionality.

After making edits to any of the plugins it is required that you publish the components to the Reactium Registry.

## Updating A Plugin
Plugins can be found in the */actinium_modules/@atomic-reactor*

## Creating A Plugin
Run the plugin command:

```
arcli plugin -d cwd/actinium_modules/@atomic-reactor/actinium-your-plugin-directory
```

## Publishing
Run the publisher command:

```
arcli publisher
```

After each publish you will need to update the *actiniumDependencies* object of the [actinium-config.js](https://github.com/Atomic-Reactor/Actinium-Plugins/blob/master/.core/actinium-config.js) file and the [package.json](https://github.com/Atomic-Reactor/Actinium-Plugins/blob/master/package.json) file of the [Actinium](https://github.com/Atomic-Reactor/Actinium) repository with the updated plugin manifest.

_Note: The plugin manifest will be copied to the clipboard after publishing._

## Plugin Manifest
If you need to retrieve the plugin manifest for any random reason run:
```
arcli deps
```

_Note: The plugin manifest will be copied to the clipboard._
