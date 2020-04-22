eo discovery
===============
Provides eureka integration together with [express.js](http://expressjs.com/). It enables service endpoints for health check, environment, logging and http call tracing as used by the eureka service and admin service.

Getting started
---------------
You need at least node version 8. You can install it from [here](https://nodejs.org/).
In your project use

```
npm install eo-discovery
```
to add the eo-discovery modules.

```javascript
const express = require('express')
const discovery = require('eo-discovery')

// Create a express app
const app = express()
// Start up the express application ...
var listener = app.listen(3000, () => {
  // ... and register with the eureka discovery
  // Hint: If your eureka registry is not on localhost, you must provide a EUREKA_HOST environment variable.
  discovery.init({
      name : 'MyNodeService',           // We need a name for the service, so others can use it.
      express : app,                    // The express app is used to provide the discovery endpoints
      port : listener.address().port    // This is the public port for the registry, we just pass the express listener port
  })
})
```
See the [examples folder](https://github.com/OPTIMALSYSTEMS/eo-discovery/tree/master/examples) for more usage examples.

Methods provided
----------------
The eureka object provides these methods.

To get the base url for another service registered with the eureka discovery, use

```
getAppUrl(ServiceName)
```
to get a absolute url to the service with the given name. A error is thrown, if the service is not known in the registry.


To get the central configuration for this serive, use this method on the discovery object.
```
getConfig()
```
The configuration returned depends on the profiles in use.

To unregister from the eureka registry and stop sending heartbeats use.
```
shutdown()
```

Support for the log panel
-------------------------

If you want to expose your logging to the administration interface you must provide a path to the logfile. To do this, please set a 'logfile' property
in the initialization parameter. The logfile property must be a absolute path or a relative path from the current directory. Note a relative path using '..' is not allowed.
The content of this file will be presented in the log panel of the administration interface.

Customize the logging
---------------------
The default logger is just using console output. If you want the library to use your own logger you can provide a implementation by providing a logger propery as initialization parameter. 
This implementation must provide functions for logging in info,error,warning and debug level.

For example:
```javascript
  discovery.init({
      name : 'MyNodeService',           // We need a name for the service, so others can use it.
      express : app,                    // The express app is used to provide the discovery endpoints
      port : listener.address().port    // This is the public port for the registry, we just pass the express listener port
      logger : {                        // Provide logger - mylogger may be any own logger or you forward the calls to a library like winston
        {
          debug : (m) => {mylogger.log('DEBUG', m)},
          info  : (m) => {mylogger.log('INFO', m)},
          warn  : (m) => {mylogger.log('WARN', m)},
          error : (m) => {mylogger.log('ERROR', m)}
        }
      }
  })

```

Providing a custom health check
-------------------------------

The default implementation for the health check always sends a 'UP' state. If you want to provide a custom health check, you can provide a health callback as init parameter.
See [health check example](https://github.com/OPTIMALSYSTEMS/eo-discovery/blob/master/examples/health.js).


Providing custom metrics
-------------------------

Basic system stats as available for the node runtime are provided as default metrics. These system metrics include the uptime and memory usage.
If you want to provide counters and gauges for the metrics panel, you can set them by providing a metrics callback as init parameter.
See [metrics example](https://github.com/OPTIMALSYSTEMS/eo-discovery/blob/master/examples/metrics.js).


Providing custom package information
------------------------------------
By default the package.json that is located in the current working directory is used to provide information for the eureka info call. The used properties from the package.json are : name,version,description.
These information is included in the return if the /info method is called. You may override this behaviour by providing your own package object, that has these properties available. The name property is NOT used as service name. It is just used as informational 'package-name' in the info.
See [custom package information example](https://github.com/OPTIMALSYSTEMS/eo-discovery/blob/master/examples/info.js)

Environment variables
---------------------

The following environment variables are used during the runtime.

#### EUREKA_HOST
Default: `localhost`

This variable determines the eureka server to be used. This may be a ip address or hostname. This must be set, if the eureka service is running on a different machine.

#### EUREKA_PORT
Default: `7261`

The eureka registry port.

#### EUREKA_RETRY
Default: `20`

Number of retry attempts to reach the eureka registry. The wait time between each try, is increased by 500ms.

#### EUREKA_SERVICEPATH
Default: `/eureka/apps`

The eureka service path prefix. It should seldom be needed to change this.

#### APP_PORT
Default: `7461`

The public port of the application.

#### APP_PROFILE
Default: ``

The profiles of the application. This determines which configuration is in use.

#### APP_NAME
Default: ``

The name (appId) of the application as registered with the eureka registry.

#### PUBLIC_HOST
Default: `os.hostname()`

This is the hostname that is used during registration with the eureka registry. It may be needed to set this variable, if the service is running inside a docker container. This variable determines how the eureka service can reach the service.

####  PUBLIC_PORT
Default: Same as `APP_PORT`.

This tells the eureka registery under which port the service is reachable. It may be needed to set this variable, if the service is running inside a docker container or behind a proxy service.
