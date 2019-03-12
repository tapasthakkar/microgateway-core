'use strict';
const request = require('request');
let { user, password, key, secret, org, env, tokenSecret, tokenId } = require('./env.js');

function getJWTProm() {
  return new Promise((resolve, reject) => {
    request(
      {
        uri: `https://${org}-${env}.apigee.net/edgemicro-auth/token`,
        method: 'POST',
        auth: {
          user: key,
          pass: secret,
          sendImmediately: true
        },
        json: {
          client_id: tokenId,
          client_secret: tokenSecret,
          grant_type: 'client_credentials',
          username: user,
          password: password
        }
      },
      function(err, resp, body) {
        if (err) reject({ err, msg: 'getjwt error' });
        else resolve({ resp, body });
      }
    );
  });
}

function getJWT(cb) {
  request(
    {
      uri: `https://${org}-${env}.apigee.net/edgemicro-auth/token`,
      method: 'POST',
      auth: {
        user: key,
        pass: secret,
        sendImmediately: true
      },
      json: {
        client_id: tokenId,
        client_secret: tokenSecret,
        grant_type: 'client_credentials',
        username: user,
        password: password
      }
    },
    function(err, resp, body) {
      console.log('body-jwt', body.token);
      if (cb) cb(body.token);
    }
  );
}
module.exports = {
  getJWT,
  //   getProxiesBootstrap,
  //   getAccessToken,
  getJWTProm
  //   getProducts,
  //   apiProducts
};
