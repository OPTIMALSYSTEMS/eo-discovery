/**
 * This example provides no rest endpoints, but is providing a custom health check integration.
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
      name    : 'HealthExampleService',     // We need a name for the service, so others can use it.
      express : app,                        // The express app is used to provide the discovery endpoints
      port    : listener.address().port,    // This is the public port for the registry, we just pass the express listener port
      health  : function(req,res) {         // Provide a custom health function. status must be set. Request and response are provided by express.
        res.status(200).send({
          status : 'UP',
          description : 'Custom health check example',
          sample1 : {
            status : 'OUT_OF_SERVICE',
            description : 'Example for a sub service',
            value: 42
          },
          sample2 : {
            status : 'DOWN',
            description : 'Example for a down sub service',
            value: 43
          },
          sample3 : {
            status : 'UP',
            description : 'Example for a up sub service',
            value: 44
          },
          sample4 : {
            status : 'STARTING',
            description : 'Example for a starting sub service',
            value: 45
          }
        });
      }
  })
})
