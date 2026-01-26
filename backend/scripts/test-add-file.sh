#!/bin/bash

# Script test để build transaction payload cho file test-file.txt
# Usage: ./scripts/test-add-file.sh

ACCOUNT_ADDRESS="0x0f99087870768927070b364eb50e505a44755df7e6beb7b0b3d4ecc98c15bbad"
API_URL="http://localhost:3000"

echo "🧪 Testing Add File Transaction Payload Builder"
echo "================================================"
echo ""

# Step 1: Upload file (if needed)
echo "📤 Step 1: Uploading test-file.txt..."
UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/api/file/upload" -F "file=@test-file.txt")

if [ $? -ne 0 ]; then
    echo "❌ Error: Could not upload file. Is the server running?"
    exit 1
fi

# Extract blobId, fileName, size from upload response
BLOB_ID=$(echo $UPLOAD_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['blobId'])" 2>/dev/null)
FILE_NAME=$(echo $UPLOAD_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['fileName'])" 2>/dev/null)
FILE_SIZE=$(echo $UPLOAD_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['size'])" 2>/dev/null)

if [ -z "$BLOB_ID" ]; then
    echo "❌ Error: Could not extract blobId from upload response"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo "✅ File uploaded successfully!"
echo "   - blobId: $BLOB_ID"
echo "   - fileName: $FILE_NAME"
echo "   - size: $FILE_SIZE bytes"
echo ""

# Step 2: Extract file extension
FILE_EXTENSION="${FILE_NAME##*.}"
if [ "$FILE_EXTENSION" = "$FILE_NAME" ]; then
    FILE_EXTENSION="txt"  # Default extension
fi

echo "📝 Step 2: Building transaction payload..."
echo "   - Account: $ACCOUNT_ADDRESS"
echo "   - Folder Index: 0 (root)"
echo "   - File Name: $FILE_NAME"
echo "   - Blob ID: $BLOB_ID"
echo "   - Extension: $FILE_EXTENSION"
echo ""

# Step 3: Build transaction payload
PAYLOAD_JSON=$(cat <<EOF
{
  "accountAddress": "$ACCOUNT_ADDRESS",
  "folderIndex": 0,
  "fileName": "$FILE_NAME",
  "blobId": "$BLOB_ID",
  "size": $FILE_SIZE,
  "extension": "$FILE_EXTENSION",
  "isEncrypted": false
}
EOF
)

RESPONSE=$(curl -s -X POST "${API_URL}/api/drive/add-file" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_JSON")

if [ $? -ne 0 ]; then
    echo "❌ Error: Could not build transaction payload"
    exit 1
fi

# Pretty print response
echo "✅ Transaction payload built successfully!"
echo ""
echo "📋 Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract transaction details
echo "📦 Transaction Details:"
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'meta' in data:
    meta = data['meta']
    print(f\"   - Module: {meta.get('moduleAddress', 'N/A')}::{meta.get('moduleName', 'N/A')}::{meta.get('functionName', 'N/A')}\")
if 'payload' in data:
    payload = data['payload']
    print(f\"   - Function: {payload.get('function', 'N/A')}\")
    print(f\"   - Arguments: {len(payload.get('functionArguments', []))} arguments\")
" 2>/dev/null

echo ""
echo "✨ Next steps:"
echo "   1. Copy the transaction payload from above"
echo "   2. Use Petra wallet to sign and submit this transaction"
echo "   3. After transaction is confirmed, check drive data at:"
echo "      ${API_URL}/api/drive/${ACCOUNT_ADDRESS}"
echo ""
