Eureka integration with express.js
----------------------------------

See example folder for usage.


Environment variables
---------------------

The following environment variables are used.

### EUREKA_HOST
Default: `localhost`

This variable determines the eureka server to be used. This may be a ip address or hostname. This must be set, if the eureka service is running on a different machine.

### EUREKA_PORT
Default: `7261`

The eureka registry port.

### EUREKA_SERVICEPATH
Default: `/eureka/apps`

The eureka service path prefix. It should seldom be needed to change this.

### APP_PORT
Default: `7461`

The public port of the application.

### APP_PROFILE
Default: ``

The profiles of the application. This determines which configuration is in use.

### APP_NAME
Default: ``

The name (appId) of the application as registered with the eureka registry.

### PUBLIC_HOST
Default: `os.hostname()`

This is the hostname that is used during registration with the eureka registry. It may be needed to set this variable, if the service is running inside a docker container. This variable determines how the eureka service can reach the service.

###  PUBLIC_PORT
Default: Same as `APP_PORT`.

This tells the eureka registery under which port the service is reachable. It may be needed to set this variable, if the service is running inside a docker container or behind a proxy service.
