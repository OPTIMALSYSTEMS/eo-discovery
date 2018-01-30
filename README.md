enaio discovery
===============
Provides eureka integration together with [express.js](http://expressjs.com/). It enables service endpoints for health check, environment, logging and http call tracing as used by the eureka service and admin service.

Getting started
---------------
You need at least node version 8. You can install it from [here](https://nodejs.org/).
In your project use

```
npm install enaio-discovery
```
to add the enaio-discovery modules.

```javascript
const express = require('express')
const eureka = require('enaio-eureka')

// Create a express app
const app = express()
// Start up the express application ...
var listener = app.listen(3000, () => {
  // ... and register with the eureka discovery
  // Hint: If your eureka registry is not on localhost, you must provide a EUREKA_HOST environment variable.
  eureka.init({
      name : 'MyNodeService',           // We need a name for the service, so others can use it.
      express : app,                    // The express app is used to provide the discovery endpoints
      port : listener.address().port    // This is the public port for the registry, we just pass the express listener port
  })
})
```
See example folder for more usage examples.

Methods provided
----------------
The eureka object provides these methods.

To get the base url for another service registered with the eureka discovery, use

```
getAppUrl(ServiceName)
```
to get a absolute url to the service with the given name.


To get the central configuration for this serive, use
```
getConfig()
```

Environment variables
---------------------
The following environment variables are used during the runtime.

#### EUREKA_HOST
Default: `localhost`

This variable determines the eureka server to be used. This may be a ip address or hostname. This must be set, if the eureka service is running on a different machine.

#### EUREKA_PORT
Default: `7261`

The eureka registry port.

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
