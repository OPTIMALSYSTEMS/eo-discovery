const http = require('http');
const https = require('https');

/**
 * Promise-based HTTP request using built-in Node.js http/https modules.
 *
 * @param {string} url - Full URL to request
 * @param {object} [options] - Request options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {object} [options.headers] - Additional headers
 * @param {object|string} [options.body] - Request body (objects are JSON-stringified)
 * @returns {Promise<{statusCode: number, body: string, headers: object}>}
 */
function request(url, options) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;

    const method = (options && options.method) || 'GET';
    const headers = Object.assign({}, options && options.headers);

    let bodyData;
    if (options && options.body !== undefined) {
      bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: headers
    };

    const req = transport.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: Buffer.concat(chunks).toString(),
          headers: res.headers
        });
      });
    });

    req.on('error', reject);

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

module.exports = request;
