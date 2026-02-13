const request = require('./http-client');

module.exports = async (url) => {
  const res = await request(url);
  if (res.statusCode >= 400) {
    throw new Error('Request to ' + url + ' failed with status ' + res.statusCode);
  }
  return res.body;
};
