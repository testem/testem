const { expect } = require('chai');

describe('tests/helpers/http_client.mjs', function() {
  it('loads and exports a got-style client', async function() {
    const { client } = await import('./helpers/http_client.mjs');
    expect(client).to.be.a('function');
    expect(client.get).to.be.a('function');
    expect(client.extend).to.be.a('function');
  });
});
