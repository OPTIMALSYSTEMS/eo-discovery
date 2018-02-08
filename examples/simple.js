/**
 * Simple minimal example that provides no rest endpoints. It just registers with the eureka discovery.
 */
const eureka = require('../eureka.js');       // Change to require('enaio-discovery') if you copy this example
const express = require('express')

// Create a express app
const app = express()
// Start up the express application ...
var listener = app.listen(5670, () => {
  // ... and register with the eureka discovery
  // Hint: If your eureka registry is not on localhost, you must provide a EUREKA_HOST environment variable.
  eureka.init({
      name : 'SimpleExampleService',    // We need a name for the service, so others can use it.
      express : app,                    // The express app is used to provide the discovery endpoints
      port : listener.address().port    // This is the public port for the registry, we just pass the express listener port
  })
})
