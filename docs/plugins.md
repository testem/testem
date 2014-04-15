Testem Server Plugin Configuration
==================================

The Testem server configuration can be extended via the Connect middleware system. An array of plugins is specified in your testem config file like this:

Basic Plugin Configuration
--------------------------

```json
{
  "plugins": [{
    "path": "./integration_tests/testem-proxy"
  }]
}
```

Each plugin must specify a `path` property. The `path` property is used as the module name to `require` in the plugin node module. Paths can be specified relative to the current working directory (`./my-plugin`), or, if a plugin is installed via npm, the module name can be used (`some-npm-plugin`);

Other properties can be specified as part of a plugin configuration. Each plugin's configuration will be passed to the plugin when it is initialized.

Creating A Custom Plugin
------------------------

A Testem server plugin is simply a node module that exports an `init` function. This example configures an additional route on the Testem server to 'say hello'.

```javascript
module.exports.init = function(pluginConfig, app){
  app.get('/say-hello', function(req, res){
    res.send('Hello!');
  });
};
```

The plugin's init method should accept two parameters. The first is the plugin's configuration from the Testem config file (including the path). The second parameter is the Testem Express server instance. The Testem server can be configured to handle `get` and `post` routes, or configured to use additional middleware by calling `app.use()`.

For more information about how to configure Connect middleware, see the [Connect documentation](http://www.senchalabs.org/connect/).
