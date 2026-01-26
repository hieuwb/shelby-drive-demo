#!/usr/bin/env node

/**
 * Test script to build transaction payload for test-file.txt
 * Usage: node scripts/test-add-file.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ACCOUNT_ADDRESS = '0x0f99087870768927070b364eb50e505a44755df7e6beb7b0b3d4ecc98c15bbad';
const API_URL = 'http://localhost:3000';
const TEST_FILE = path.join(__dirname, '..', 'test-file.txt');

async function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      method: method,
      headers: data ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function uploadFile(filePath) {
  // For simplicity, using form-data would require a library
  // This is a simplified version - you might want to use 'form-data' package
  console.log('📤 Step 1: Uploading file...');
  console.log('   Note: Using simplified file upload (you may need to use form-data package for production)');

  // Mock upload response for testing
  return {
    blobId: `shelby://test-file-${Date.now()}`,
    fileName: path.basename(filePath),
    size: fs.statSync(filePath).size,
    mimeType: 'text/plain'
  };
}

async function buildTransaction(accountAddress, fileInfo) {
  const fileExtension = path.extname(fileInfo.fileName).slice(1) || 'txt';

  const payload = {
    accountAddress,
    folderIndex: 0,
    fileName: fileInfo.fileName,
    blobId: fileInfo.blobId,
    size: fileInfo.size,
    extension: fileExtension,
    isEncrypted: false
  };

  console.log('📝 Step 2: Building transaction payload...');
  console.log(`   - Account: ${accountAddress}`);
  console.log(`   - Folder Index: 0 (root)`);
  console.log(`   - File Name: ${fileInfo.fileName}`);
  console.log(`   - Blob ID: ${fileInfo.blobId}`);
  console.log(`   - Extension: ${fileExtension}`);
  console.log('');

  const response = await makeRequest('POST', `${API_URL}/api/drive/add-file`, payload);
  return response;
}

async function main() {
  console.log('🧪 Testing Add File Transaction Payload Builder');
  console.log('================================================');
  console.log('');

  try {
    // Check if test file exists
    if (!fs.existsSync(TEST_FILE)) {
      console.log(`❌ Error: Test file not found at ${TEST_FILE}`);
      console.log('   Creating a test file...');
      fs.writeFileSync(TEST_FILE, 'Hello, this is a test file!\n');
    }

    // Step 1: Upload file
    const uploadResult = await uploadFile(TEST_FILE);
    console.log('✅ File uploaded successfully!');
    console.log(`   - blobId: ${uploadResult.blobId}`);
    console.log(`   - fileName: ${uploadResult.fileName}`);
    console.log(`   - size: ${uploadResult.size} bytes`);
    console.log('');

    // Step 2: Build transaction payload
    const transactionResult = await buildTransaction(ACCOUNT_ADDRESS, uploadResult);

    if (transactionResult.error) {
      console.error('❌ Error:', transactionResult.error);
      if (transactionResult.message) {
        console.error('   Message:', transactionResult.message);
      }
      process.exit(1);
    }

    console.log('✅ Transaction payload built successfully!');
    console.log('');
    console.log('📋 Response:');
    console.log(JSON.stringify(transactionResult, null, 2));
    console.log('');

    if (transactionResult.meta) {
      console.log('📦 Transaction Details:');
      const { meta, payload } = transactionResult;
      console.log(`   - Module: ${meta.moduleAddress}::${meta.moduleName}::${meta.functionName}`);
      if (payload) {
        console.log(`   - Function: ${payload.function}`);
        console.log(`   - Arguments: ${payload.functionArguments?.length || 0} arguments`);
      }
    }

    console.log('');
    console.log('✨ Next steps:');
    console.log('   1. Copy the transaction payload from above');
    console.log('   2. Use Petra wallet to sign and submit this transaction');
    console.log('   3. After transaction is confirmed, check drive data at:');
    console.log(`      ${API_URL}/api/drive/${ACCOUNT_ADDRESS}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

