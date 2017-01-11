const assert = require('assert');
const microgatewayCore = require('../index');


describe('module exposure', () => {
  it('exposes a logging class for use.', () => {
   assert.ok(microgatewayCore.Logging);
  });
});
