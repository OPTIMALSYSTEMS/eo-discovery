/**
 * Handles the euraka endpoints for health/info/env/log using express.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');
const parseRange = require('range-parser');
const counterMetrics = {};

const incrementCounter = (name) => {
  var counter = counterMetrics[name];
  counterMetrics[name]=( counter ? counter+1 : 1);
}

module.exports.init = (parameter, log, discovery) => {

  if( !parameter.express ) {
    throw new Error('express parameter not set.');
  }

  if( !parameter.package ) {
    let defaultLocation = path.join(process.cwd(),'/package.json');
    parameter.package = require(defaultLocation);  // try to load package.json from local executing directory
    if( !parameter.package ) {
      // Use some dummy data
      parameter.package = {
        name : '',
        description : '',
        version : '0.0.1'
      }
      log.warn('Default package information is not available. Not found at default location '+defaultLocation+' and is not given as init parameter.');
    } else {
      log.debug('Package information is used from location '+defaultLocation+'.');
    }
  } else {
    log.debug('Package information is given as init parameter: '+JSON.stringify(parameter.package));
  }

  var tracesize = parameter.tracesize || 100;
  var trace = [];

  parameter.express.use(function (req, res, next) {
    var start = Date.now();

    // Capture begin of call
    var traceentry = {
      timestamp : start,
      info : {
        method : req.method,
        path : req.originalUrl,
        headers : {
          request : req.headers
        }
      }
    };
    trace.unshift(traceentry);

    // Splice to trace size
    while( trace.length > tracesize ) {
      trace.splice(trace.length-1,1);
    }

    // Capture end of call
    var end = res.end;
    res.end = (chunk,encoding) => {
      traceentry.info.headers.response = res._headers;
      traceentry.info.headers.response.status = ''+res.statusCode;
      traceentry.info.duration = (Date.now() - start);
      res.end = end;
      incrementCounter('http.calls');
      if( res.statusCode>=400 && res.statusCode<=499 ) {
        incrementCounter('http.calls_error');
      }
      if( res.statusCode>=500 ) {
        incrementCounter('http.calls_internalerror');
      }
      incrementCounter('http.status.'+res.statusCode);
      res.end(chunk, encoding);
    }

    // Continue
    next();
  })

  parameter.express.get('/manage/trace', function(req,res) {
    log.debug('trace was called '+trace.length);
    res.status(200).send(trace);
  })

  parameter.express.get('/manage/health', function(req,res) {
    if( parameter.health ) {
      log.debug('Health was called. Using health callback.');
      parameter.health(req,res);
    } else {
      log.debug('Health was called. Sending default UP result.');
      res.status(200).send(
        {
          "description" : parameter.package.description,
          "status":"UP"
        }
      );
    }
  });

  parameter.express.get('/manage/logfile', function(req,res) {
    log.debug('Logfile was called.');
    if( parameter.logfile ) {
      var normalizedPath = path.normalize(parameter.logfile);
      const stats = fs.statSync(normalizedPath);
      log.debug('Logfile stats was called on '+normalizedPath);
      if( req.headers.range ) {
        // parse header from request
        var range = parseRange( stats.size, req.headers.range);
        if( range == -1 ) {
          // Fix ranges that res.sendFile does not understand...
          req.headers.range = 'bytes=0-'+stats.size;
        }
      }
      res.sendFile(normalizedPath, {
          //root: process.cwd(),  // Note: The logfile file path must be relative to the working dir
          headers: {
            'Content-Range': req.headers.range || 'bytes=0-'+stats.size,   // Content-Range is always needed for eureka admin
          }
        } );
    } else {
      res.sendStatus(404);
    }
  });

  parameter.express.get('/swagger-ui.html', function(req,res) {
    res.redirect('/index.html');
  });

  parameter.express.get('/manage/info', function(req,res) {
    log.debug('Info was called');
    res.status(200).send(
      {
        version : parameter.package.version,
        app: {
          name : parameter.name,
          description : parameter.package.description,
          port : parameter.port,
          'node-version' : process.version,
          'package-name' : parameter.package.name,
          pid : process.pid,
          ppid : process.ppid,
          platform : process.platform,
          arch : process.arch,
          cwd : process.cwd(),
          execPath : process.execPath
        }
      }
    );
  });

  parameter.express.get('/manage/metrics', function(req,res) {
    log.debug('Metrics was called');
    var mem = process.memoryUsage();
    var metrics = {
      'heap' : mem.heapTotal / 1024,
      'heap.used' : mem.heapUses / 1024,
      'heap.init' : 0,
      'heap.commited' : 0,
      'mem' : mem.heapTotal / 1024,
      'mem.free' : (mem.heapTotal-mem.heapUsed) / 1024,
      'uptime' : process.uptime()*1000
    };
    for( m in counterMetrics ) {
      metrics['counter.'+m] = counterMetrics[m];
    }
    if( parameter.metrics ) {
      parameter.metrics( metrics );
    }
    res.status(200).send( metrics );
  });

  parameter.express.get('/manage/env', function(req,res) {
    log.debug('Env was called');
    (async () => {
      var config = await discovery.getConfig();
      var configFiltered = {};

      for (var key in config) {
        // skip loop if the property is from prototype
        if (!config.hasOwnProperty(key)) continue;
        // skip loop if the property key contains password
        if (key.match(/password/i) ) {
          // This is the same behaviour as in the spring actuator
          // Prevents to give a clear text password to the admin gui.
          configFiltered[key]='******';
        } else {
          configFiltered[key]=config[key];
        }
      }
      // Send the result
      res.status(200).send( {
        profiles : ( parameter.profile ? parameter.profile.split(',') : ''),
        commandLineArgs : process.argv,
        systemEnvironment : process.env,
        configuration : configFiltered
      });
    })();
  });
}
