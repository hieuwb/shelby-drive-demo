#!/bin/bash

# Script test để download file bằng blobId
# Usage: ./scripts/test-download.sh [blobId]

API_URL="http://localhost:3000"

if [ -z "$1" ]; then
    echo "📥 Testing File Download"
    echo "========================"
    echo ""
    echo "Usage: $0 <blobId>"
    echo "Example: $0 'shelby://test-file-1768620603295'"
    echo ""
    echo "Or test with a file from drive:"
    echo "1. Get drive data: curl ${API_URL}/api/drive/0x0f99087870768927070b364eb50e505a44755df7e6beb7b0b3d4ecc98c15bbad"
    echo "2. Extract blobId from response"
    echo "3. Run: $0 <blobId>"
    exit 1
fi

BLOB_ID="$1"

echo "📥 Testing File Download"
echo "========================"
echo ""
echo "BlobId: $BLOB_ID"
echo ""

# URL encode the blobId
ENCODED_BLOB_ID=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$BLOB_ID'))" 2>/dev/null || echo "$BLOB_ID")

echo "🔍 Step 1: Downloading file..."
echo "   URL: ${API_URL}/api/file/download?blobId=${ENCODED_BLOB_ID}"
echo ""

# Download file
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/file/download?blobId=${ENCODED_BLOB_ID}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ File downloaded successfully!"
    echo ""
    
    # Save to file
    OUTPUT_FILE="downloaded-$(basename $BLOB_ID).txt"
    echo "$BODY" > "$OUTPUT_FILE"
    
    echo "📄 File saved to: $OUTPUT_FILE"
    echo "📊 File size: $(wc -c < "$OUTPUT_FILE") bytes"
    echo ""
    echo "📋 First 20 lines:"
    head -20 "$OUTPUT_FILE"
else
    echo "❌ Error downloading file (HTTP $HTTP_CODE)"
    echo ""
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
fi
