const request = require('./http-client');

class EurekaClient {

  /**
   * @param {object} config
   * @param {object} config.instance - Instance registration data
   * @param {object} config.eureka - Eureka server connection settings
   * @param {string} config.eureka.host
   * @param {number} config.eureka.port
   * @param {string} config.eureka.servicePath - e.g. '/eureka/apps'
   * @param {number} [config.eureka.maxRetries=3]
   * @param {object} [config.logger]
   */
  constructor(config) {
    this.instance = config.instance;
    this.eureka = config.eureka;
    this.logger = config.logger || {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

    this.maxRetries = this.eureka.maxRetries || 3;
    this.requestRetryDelay = this.eureka.requestRetryDelay || 500;
    this.heartbeatInterval = this.eureka.heartbeatInterval || 30000;
    this.registryFetchInterval = this.eureka.registryFetchInterval || 30000;

    this.baseUrl = 'http://' + this.eureka.host + ':' + this.eureka.port + this.eureka.servicePath;

    this.registry = {};
    this._heartbeatTimer = null;
    this._registryTimer = null;
  }

  /**
   * Perform an HTTP request with retry logic.
   */
  async _requestWithRetry(url, options) {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await request(url, options);
        if (res.statusCode >= 500) {
          lastError = new Error('Server error: ' + res.statusCode + ' from ' + url);
          this.logger.warn('Eureka request to ' + url + ' returned ' + res.statusCode + ', attempt ' + (attempt + 1));
        } else {
          return res;
        }
      } catch (err) {
        lastError = err;
        this.logger.warn('Eureka request to ' + url + ' failed: ' + (err.message || err.code || err) + ', attempt ' + (attempt + 1));
      }
      if (attempt < this.maxRetries) {
        await this._delay(this.requestRetryDelay * (attempt + 1));
      }
    }
    throw lastError;
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build the JSON payload for registration as expected by the Eureka REST API.
   */
  _buildInstancePayload() {
    const inst = this.instance;
    return {
      instance: {
        instanceId: inst.instanceId,
        hostName: inst.hostName,
        app: inst.app.toUpperCase(),
        ipAddr: inst.ipAddr,
        status: 'UP',
        overriddenstatus: 'UNKNOWN',
        port: {
          '$': inst.port['$'],
          '@enabled': inst.port['@enabled']
        },
        securePort: {
          '$': 443,
          '@enabled': 'false'
        },
        countryId: 1,
        dataCenterInfo: inst.dataCenterInfo,
        leaseInfo: {
          renewalIntervalInSecs: 30,
          durationInSecs: 90
        },
        metadata: {
          '@class': 'java.util.Collections$EmptyMap'
        },
        homePageUrl: 'http://' + inst.hostName + ':' + inst.port['$'] + '/',
        statusPageUrl: inst.statusPageUrl,
        healthCheckUrl: inst.healthCheckUrl,
        vipAddress: inst.vipAddress,
        isCoordinatingDiscoveryServer: 'false',
        lastUpdatedTimestamp: '' + Date.now(),
        lastDirtyTimestamp: '' + Date.now()
      }
    };
  }

  /**
   * Register this instance with Eureka.
   */
  async _register() {
    const appName = this.instance.app.toUpperCase();
    const url = this.baseUrl + '/' + appName;
    const payload = this._buildInstancePayload();

    this.logger.debug('Registering with Eureka at ' + url);

    const res = await this._requestWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: payload
    });

    if (res.statusCode !== 204) {
      throw new Error('Eureka registration failed with status ' + res.statusCode);
    }

    this.logger.info('Registered with Eureka as ' + appName);
  }

  /**
   * Send a heartbeat to Eureka. If 404 is returned, re-register.
   */
  async _heartbeat() {
    const appName = this.instance.app.toUpperCase();
    const instanceId = this.instance.instanceId;
    const url = this.baseUrl + '/' + appName + '/' + instanceId;

    try {
      const res = await this._requestWithRetry(url, { method: 'PUT' });

      if (res.statusCode === 404) {
        this.logger.warn('Eureka heartbeat returned 404, re-registering');
        await this._register();
      } else if (res.statusCode !== 200) {
        this.logger.warn('Eureka heartbeat returned unexpected status ' + res.statusCode);
      }
    } catch (err) {
      this.logger.error('Eureka heartbeat failed: ' + (err.message || err.code || err));
    }
  }

  /**
   * Deregister this instance from Eureka.
   */
  async _deregister() {
    const appName = this.instance.app.toUpperCase();
    const instanceId = this.instance.instanceId;
    const url = this.baseUrl + '/' + appName + '/' + instanceId;

    this.logger.debug('Deregistering from Eureka at ' + url);

    try {
      await this._requestWithRetry(url, { method: 'DELETE' });
      this.logger.info('Deregistered from Eureka');
    } catch (err) {
      this.logger.error('Eureka deregistration failed: ' + (err.message || err.code || err));
    }
  }

  /**
   * Fetch the full registry from Eureka and cache instances by app name (uppercased).
   * Only instances with status=UP are kept.
   */
  async _fetchRegistry() {
    const url = this.baseUrl;

    try {
      const res = await this._requestWithRetry(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.statusCode !== 200) {
        this.logger.warn('Eureka registry fetch returned status ' + res.statusCode);
        return;
      }

      const data = JSON.parse(res.body);
      const newRegistry = {};

      const apps = data && data.applications && data.applications.application;
      if (Array.isArray(apps)) {
        for (const app of apps) {
          const name = app.name.toUpperCase();
          const instances = Array.isArray(app.instance) ? app.instance : [app.instance];
          newRegistry[name] = instances.filter((inst) => inst && inst.status === 'UP');
        }
      }

      this.registry = newRegistry;
      this.logger.debug('Eureka registry fetched, ' + Object.keys(newRegistry).length + ' app(s)');
    } catch (err) {
      this.logger.error('Eureka registry fetch failed: ' + (err.message || err.code || err));
    }
  }

  /**
   * Start the Eureka client: register, fetch registry, start heartbeat and registry polling.
   * @param {function} [callback] - Called when startup is complete
   */
  start(callback) {
    this._start()
      .then(() => { if (callback) callback(); })
      .catch((err) => {
        this.logger.error('Eureka client start failed: ' + (err.message || err.code || err));
        if (callback) callback(err);
      });
  }

  async _start() {
    await this._register();
    await this._fetchRegistry();

    this._heartbeatTimer = setInterval(() => this._heartbeat(), this.heartbeatInterval);
    this._registryTimer = setInterval(() => this._fetchRegistry(), this.registryFetchInterval);
  }

  /**
   * Stop the Eureka client: deregister and stop timers.
   */
  stop() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this._registryTimer) {
      clearInterval(this._registryTimer);
      this._registryTimer = null;
    }
    this._deregister();
  }

  /**
   * Get cached instances for the given app ID.
   * @param {string} appId - Application name (case-insensitive)
   * @returns {Array} Array of instance objects, or empty array
   */
  getInstancesByAppId(appId) {
    return this.registry[appId.toUpperCase()] || [];
  }
}

module.exports = EurekaClient;
