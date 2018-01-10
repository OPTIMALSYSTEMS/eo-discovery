/**
 * Wrapper around eureka-js-client that provides endpoints for the spring boot admin / eureka.
 */
const Eureka = require('eureka-js-client').Eureka;
const ip = require('ip');
const request = require('./lib/request-promise');
const expressIntegration = require('./lib/eureka-express');
const os = require('os');

// This is used as default logger
var log = {
  debug : (s) => {console.log('DEBUG:  '+s)},
  info  : (s) => {console.log('INFO :  '+s)},
  warn  : (s) => {console.log('WARN :  '+s)},
  error : (s) => {console.log('ERROR:  '+s)}
}

const exported = (eurekaClient, parameter) => {

  const getAppUrl = function(id) {
    var apps=eurekaClient.getInstancesByAppId(id);
    // Use routing service?
    // We use just a random robin here ...
    if( apps && apps.length>0 ) {
      var num = Math.floor(Math.random(apps.length));
      return apps[num].homePageUrl;
    } else {
      throw new Error('Unable to find app with id '+id+' in eureka registry.');
    }
  }

  const getConfig = async () => {

    // Configuration endpoint is provided by the argus service
    var url = getAppUrl('ARGUS') + '/config/' + parameter.name + '/'+ parameter.profiles;

    log.debug("Config url : "+url);

    var result = await request(url);
    const configRaw = JSON.parse( result );
    let config = {};
    configRaw.propertySources.forEach( (propertySource) => {
      if( propertySource.source ) {
        for (var name in propertySource.source) {
          if (propertySource.source.hasOwnProperty(name)) {
            config[name] = propertySource.source[name];
          }
        }
      }
    });

    log.debug("Config "+JSON.stringify(config,0,2));

    // Helper get function
    config.get = (name) => {
      return config[name];
    }

    return config;
  }

  return {
    getAppUrl : getAppUrl,
    getConfig : getConfig
  }
}

module.exports.init = async function(parameter) {

  log = parameter.logger || log;

  if( !parameter.express ) {
    throw new Error('Express app not set.');
  }


  if( !parameter.name ) {
    throw new Error('name parameter not set.');
  }

  // Determine the public host and port name
  var hostname = process.env.PUBLIC_HOST || os.hostname();
  var port = process.env.PUBLIC_PORT || parameter.port || parameter.express.address().port;

  if( !port ) {
    throw new Error('port can not be determined. Use the environement variable for PUBLIC_PORT, the parameter or start the express listener first.');
  }

  if( !parameter.eureka ) parameter.eureka={};

  var eureka = {
    host : parameter.eureka.host || process.env.EUREKA_HOST || 'localhost',
    port : parameter.eureka.port || process.env.EUREKA_PORT || 7261,
    servicePath : parameter.eureka.servicePath || process.env.EUREKA_SERVICEPATH || '/eureka/apps'
  }

  log.info('App name                : ' + parameter.name);
  log.info('App profiles            : ' + parameter.profiles);
  log.info('App port                : ' + parameter.port);
  log.info('App public host address : ' + hostname);
  log.info('App public port         : ' + port);

  log.info('Eureka hostname         : ' + eureka.host);
  log.info('Eureka port             : ' + eureka.port);
  log.info('Eureka servicepath      : ' + eureka.servicePath);

  var eurekaClient = new Eureka({
    // application instance information
    instance: {
      app: parameter.name,
      hostName: hostname,
      ipAddr: ip.address('public'),   // Does this always work?
      statusPageUrl: 'http://'+hostname+':'+port+'/manage/info',
      healthCheckUrl: 'http://'+hostname+':'+port+'/manage/health',
      port: {
        '$': port,
        '@enabled': 'true',
      },
      vipAddress: parameter.name,
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',  // This is needed by spring cloud / eureka / netflix whatever - if not set, a 400 is the response on registration
      },
      metadata : {
        instanceId : parameter.name+':'+port
      }
    },
    // eureka server host / port and configuration
    eureka : eureka,
    // forward logger
    logger : log
  });

  expressIntegration.init(parameter,log);

  await new Promise( (resolve,reject) => {
      eurekaClient.start( ()=>{
        log.info('Eureka client start done.');
        resolve();
      });
  });

  return exported(eurekaClient, parameter);
}
