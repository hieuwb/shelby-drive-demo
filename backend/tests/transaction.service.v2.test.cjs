const test = require('node:test');
const assert = require('node:assert/strict');

require('ts-node/register/transpile-only');

const {
  buildAddFileTransaction,
} = require('../src/services/transaction.service.v2');

test('buildAddFileTransaction encodes args in ABI order', () => {
  const tx = buildAddFileTransaction({
    folderId: 7,
    name: 'report.pdf',
    blobId: 'blob://abc123',
    size: 4096,
    mimeType: 'application/pdf',
  });

  assert.equal(tx.payload.function.endsWith('::drive::add_file'), true);
  assert.deepEqual(tx.payload.typeArguments, []);
  assert.deepEqual(tx.payload.functionArguments, [
    '0x626c6f623a2f2f616263313233',
    '0x7265706f72742e706466',
    4096,
    '0x6170706c69636174696f6e2f706466',
    7,
  ]);
});

test('buildAddFileTransaction preserves folderId=0', () => {
  const tx = buildAddFileTransaction({
    folderId: 0,
    name: 'a.txt',
    blobId: 'b',
    size: 1,
    mimeType: 'text/plain',
  });

  assert.equal(tx.payload.functionArguments[4], 0);
});
