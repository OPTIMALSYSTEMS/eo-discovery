/**
 * This example provides no rest endpoints, but is providing a custom metrics integration.
 */
const eureka = require('../eureka.js');       // Change to require('eo-discovery') if you copy this example
const express = require('express')

// Create a express app
const app = express()
// Start up the express application ...
var listener = app.listen(5680, () => {
  // ... and register with the eureka discovery
  // Hint: If your eureka registry is not on localhost, you must provide a EUREKA_HOST environment variable.
  eureka.init({
      name    : 'MetricsExampleService',     // We need a name for the service, so others can use it.
      express : app,                        // The express app is used to provide the discovery endpoints
      port    : listener.address().port,    // This is the public port for the registry, we just pass the express listener port
      metrics : function(metrics) {         // Provide a custom metrics function, the metrics returned are given as parameter
        metrics['counter.sampleusercount'] = 42
        metrics['gauge.samplevalue'] = 42.42
      }
  })
})
