const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

require('ts-node/register/transpile-only');
const app = require('../src/app').default;

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

test('GET / returns backend metadata and v2 drive route', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.version, '2.0.0');
    assert.equal(body.endpoints.drive, '/api/drive');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('POST /api/drive/add-file returns 400 when required fields are missing', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/drive/add-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.error, 'Missing required fields');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('POST /api/drive/add-file builds ABI-aligned payload', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/drive/add-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId: 2,
        name: 'photo.png',
        blobId: 'blob-xyz',
        size: 42,
        mimeType: 'image/png',
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.payload.function.endsWith('::drive::add_file'), true);
    assert.deepEqual(body.payload.functionArguments, [
      '0x626c6f622d78797a',
      '0x70686f746f2e706e67',
      42,
      '0x696d6167652f706e67',
      2,
    ]);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
