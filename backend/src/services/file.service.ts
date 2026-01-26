import * as fs from "fs/promises";
import * as path from "path";
import { stringToHex } from "../utils/hex";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Upload file to local storage
 * Returns blobId in format: shelby://{filename}-{timestamp}
 */
export async function uploadFile(file: Express.Multer.File): Promise<string> {
  await ensureUploadsDir();

  const timestamp = Date.now();
  const fileExtension = path.extname(file.originalname).slice(1); // Remove dot
  const baseName = path.basename(file.originalname, path.extname(file.originalname));
  const fileName = `${baseName}-${timestamp}.${fileExtension}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  // Save file to disk
  await fs.writeFile(filePath, file.buffer);

  // Generate blobId in Shelby format
  // Format: shelby://{filename}-{timestamp}
  const blobId = `shelby://${baseName}-${timestamp}`;

  console.log(`File uploaded: ${file.originalname} -> ${blobId}`);
  console.log(`File saved to: ${filePath}`);

  return blobId;
}

/**
 * Upload file to Shelby Blob service
 * TODO: Implement actual Shelby Blob API integration
 */
export async function uploadToShelbyBlob(file: Express.Multer.File): Promise<string> {
  // For now, use local storage
  // TODO: Replace with actual Shelby Blob API call
  // const blobId = await fetch(SHELBY_BLOB_API_URL, {
  //   method: 'POST',
  //   body: file.buffer,
  //   headers: { 'Content-Type': file.mimetype }
  // });
  // return blobId;

  return uploadFile(file);
}

/**
 * Get file metadata from blobId
 */
export async function getFileInfo(blobId: string) {
  await ensureUploadsDir();

  // Extract filename from blobId if stored locally
  // Format: shelby://{baseName}-{timestamp}
  // File stored as: {baseName}-{timestamp}.{extension}
  if (blobId.startsWith("shelby://")) {
    const fileNamePart = blobId.replace("shelby://", "");
    const files = await fs.readdir(UPLOADS_DIR);
    
    // Find file that starts with fileNamePart (blobId without "shelby://")
    // Example: blobId = "shelby://test-file-1234567890"
    // File = "test-file-1234567890.txt" (matches because it starts with "test-file-1234567890")
    const matchingFile = files.find((f) => {
      const nameWithoutExt = path.basename(f, path.extname(f));
      return nameWithoutExt === fileNamePart;
    });
    
    if (matchingFile) {
      const filePath = path.join(UPLOADS_DIR, matchingFile);
      const stats = await fs.stat(filePath);
      
      // Extract original filename (remove timestamp from filename)
      // Format: {baseName}-{timestamp}.{extension} -> {baseName}.{extension}
      const nameParts = path.basename(matchingFile, path.extname(matchingFile)).split("-");
      const extension = path.extname(matchingFile);
      // Remove last part (timestamp) and join the rest
      const originalName = nameParts.slice(0, -1).join("-") + extension;
      
      return {
        blobId,
        fileName: matchingFile,
        originalName: originalName || matchingFile,
        size: stats.size,
        path: filePath,
      };
    }
  }

  return null;
}

/**
 * Download file by blobId
 * Returns file buffer and metadata
 */
export async function downloadFile(blobId: string) {
  const fileInfo = await getFileInfo(blobId);
  
  if (!fileInfo) {
    throw new Error(`File not found for blobId: ${blobId}`);
  }

  // Read file from disk
  const fileBuffer = await fs.readFile(fileInfo.path);
  
  return {
    buffer: fileBuffer,
    fileName: fileInfo.fileName,
    originalName: fileInfo.originalName || fileInfo.fileName,
    size: fileInfo.size,
    path: fileInfo.path,
  };
}
