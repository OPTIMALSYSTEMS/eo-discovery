const eureka = require('./eureka.js');
const express = require('express')
const app = express()

app.get('/', (req, res) => res.send('Hello World!'))

var listener = app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
  eureka.init({
      name : 'Example-Service',
      express : app,
      port : listener.address().port
    })
});
