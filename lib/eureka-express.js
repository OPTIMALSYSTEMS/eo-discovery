/**
 * Handles the euraka endpoints for health/info/env/log using express.
 */
const packageJson = require(process.cwd()+'/package.json');
const os = require('os');
const fs = require('fs');
const parseRange = require('range-parser');

module.exports.init = (parameter,log) => {

  if( !parameter.express ) {
    throw new Error('express parameter not set.');
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
    log.debug('Health was called');
    res.status(200).send(
      {
        "description" : packageJson.description,
        "status":"UP"
      }
    );
  });

  parameter.express.get('/manage/logfile', function(req,res) {
    log.debug('Logfile was called');
    if( parameter.logfile ) {
      const stats = fs.statSync(parameter.logfile);
      log.debug('Logfile stats was called');
      if( req.headers.range ) {
        // parse header from request
        var range = parseRange( stats.size, req.headers.range);
        if( range == -1 ) {
          // Fix ranges that res.sendFile does not understand...
          req.headers.range = 'bytes=0-'+stats.size;
        }
      }
      res.sendFile(parameter.logfile, {
          root: process.cwd(),  // Note: The logfile file path must be relative to the working dir
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
        version : packageJson.version,
        app: {
          name : parameter.name,
          description : packageJson.description,
          port : parameter.port,
          'node-version' : process.version,
          'package-name' : packageJson.name,
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
    res.status(200).send({
      'heap' : mem.heapTotal / 1024,
      'heap.used' : mem.heapUses / 1024,
      'heap.init' : 0,
      'heap.commited' : 0,
      'mem' : mem.heapTotal / 1024,
      'mem.free' : (mem.heapTotal-mem.heapUsed) / 1024,
      'uptime' : process.uptime()*1000
    });
  });

  parameter.express.get('/manage/env', function(req,res) {
    log.debug('Env was called');
    res.status(200).send( {
      profiles : parameter.profiles,
      commandLineArgs : process.argv,
      systemEnvironment : process.env
    } );
  });
}
