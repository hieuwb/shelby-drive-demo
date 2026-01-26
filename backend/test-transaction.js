// Test directly
const stringToHex = (str) => "0x" + Buffer.from(str, "utf8").toString("hex");

const params = {
  folderIndex: 0,
  fileName: "test.txt",
  blobId: "shelby://test-123",
  size: 28,
  extension: "txt",
  isEncrypted: false
};

const nameHex = stringToHex(params.fileName);
const blobIdHex = stringToHex(params.blobId);
const extensionHex = stringToHex(params.extension);

const payload = {
  function: "0x...::drive::add_file",
  typeArguments: [],
  functionArguments: [
    params.folderIndex,
    nameHex,
    blobIdHex,
    params.size,
    extensionHex,
    params.isEncrypted,
  ],
};

console.log(JSON.stringify(payload, null, 2));
