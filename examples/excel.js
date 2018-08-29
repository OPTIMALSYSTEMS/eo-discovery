/**
 * Example (micro) service that uses https://www.npmjs.com/package/xlsx to extract data from excel sheets.
 * This is for demonstation usage only. For production the propper error handling is missing.
 * You must 'npm install --no-save xlsx' before you can run this example by running 'node example/excel.js'.
 *
 * If the service is registered in the registry, every one can call 'POST /ExcelReader' with a excel
 * file as body to retrieve a JSON with all data inside the excel worksheet.
 */
const eureka = require('../eureka.js'); // Change to require('eo-discovery') if you copy this example
const express = require('express')
const bodyParser = require('body-parser')
const xlsx = require('xlsx')

// Create a express app
const app = express()

// All requests are handled raw, we use the body-parser raw middleware for this.
app.use(bodyParser.raw({
  type : '*/*'
}))

// The one and only endpoint method. This method accepts a raw excel file and tries to parse it.
app.post('/', (req, res) => {
  // The request body is a Buffer object. We are using xlsx now to parse it.
  var workbook = xlsx.read( req.body, {type:'buffer'} )
  // If ok, just send the result as json.
  res.json( workbook )
})

// Start up the express application ...
var listener = app.listen(3000, () => {
  // ... and register with the eureka discovery
  // Hint: If your eureka registry is not on localhost, you must provide a EUREKA_HOST environment variable.
  eureka.init({
      name : 'ExcelReader',                 // We need a name for the service, so others can use it.
      express : app,                        // The express app is used to provide the discovery endpoints
      port : listener.address().port        // This is the public port for the registry, we just pass the express listener port
  })
})
