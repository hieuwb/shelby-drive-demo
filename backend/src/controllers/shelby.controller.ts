import { Request, Response } from "express";
import multer from "multer";
import { uploadToShelby, downloadFromShelby, listAccountBlobs } from "../services/shelby.service";
import { buildAddFileTransaction, buildDeleteFileTransaction, buildMoveToTrashTransaction, buildRestoreFromTrashTransaction, buildToggleStarTransaction } from "../services/transaction.service.shelby";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

export const uploadMiddleware = upload.single("file");

/**
 * Step 1: Upload file to Shelby network
 * Returns blob name and upload info
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    console.log("=== START UPLOAD FILE TO SHELBY ===");

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { accountAddress } = req.body;
    if (!accountAddress) {
      return res.status(400).json({ error: "Account address is required" });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    console.log(`📝 File: ${fileName}, Size: ${fileSize} bytes, Type: ${mimeType}`);

    // Upload to Shelby
    const shelbyBlobName = await uploadToShelby({
      fileBuffer,
      fileName,
      accountAddress,
    });

    console.log(`✅ Uploaded to Shelby: ${shelbyBlobName}`);

    // Return info for frontend to create blockchain transaction
    res.json({
      success: true,
      shelbyBlobName,
      fileName,
      fileSize,
      mimeType,
      message: "File uploaded to Shelby successfully. Now submit blockchain transaction.",
    });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
};

/**
 * Step 2: Build add_file transaction payload
 */
export const buildAddFilePayload = async (req: Request, res: Response) => {
  try {
    const { accountAddress, shelbyBlobName, fileName, fileSize, mimeType, folderId } = req.body;

    if (!accountAddress || !shelbyBlobName || !fileName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const transactionPayload = await buildAddFileTransaction(accountAddress, {
      shelbyBlobName,
      fileName,
      size: fileSize || 0,
      mimeType: mimeType || "application/octet-stream",
      folderId: folderId || 0,
    });

    res.json({
      success: true,
      transaction: transactionPayload,
    });
  } catch (error: any) {
    console.error("❌ Build transaction error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Download file from Shelby
 */
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { blobName, accountAddress } = req.query;

    if (!blobName || !accountAddress) {
      return res.status(400).json({ error: "Missing blobName or accountAddress" });
    }

    console.log(`⚙ Downloading ${blobName} from Shelby...`);

    const fileBuffer = await downloadFromShelby({
      blobName: blobName as string,
      accountAddress: accountAddress as string,
    });

    // Extract filename from blob name (account/filename)
    const fileName = (blobName as string).split("/").pop() || "download";

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(fileBuffer);
  } catch (error: any) {
    console.error("❌ Download error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * List files from blockchain view function
 */
export const listFiles = async (req: Request, res: Response) => {
  try {
    const { accountAddress } = req.query;

    if (!accountAddress) {
      return res.status(400).json({ error: "Account address is required" });
    }

    // Call blockchain view function to get file metadata
    // This is a placeholder - you'll need to implement the actual view function call

    res.json({
      success: true,
      files: [],
      message: "Use blockchain view function get_files to fetch file list",
    });
  } catch (error: any) {
    console.error("❌ List files error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Build transaction to toggle star
 */
export const buildToggleStarPayload = async (req: Request, res: Response) => {
  try {
    const { accountAddress, fileId } = req.body;

    const transaction = await buildToggleStarTransaction(accountAddress, fileId);
    res.json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Build transaction to move to trash
 */
export const buildMoveToTrashPayload = async (req: Request, res: Response) => {
  try {
    const { accountAddress, fileId } = req.body;

    const transaction = await buildMoveToTrashTransaction(accountAddress, fileId);
    res.json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Build transaction to restore from trash
 */
export const buildRestorePayload = async (req: Request, res: Response) => {
  try {
    const { accountAddress, fileId } = req.body;

    const transaction = await buildRestoreFromTrashTransaction(accountAddress, fileId);
    res.json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Build transaction to permanently delete
 */
export const buildDeletePayload = async (req: Request, res: Response) => {
  try {
    const { accountAddress, fileId } = req.body;

    const transaction = await buildDeleteFileTransaction(accountAddress, fileId);
    res.json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  uploadFile,
  buildAddFilePayload,
  downloadFile,
  listFiles,
  buildToggleStarPayload,
  buildMoveToTrashPayload,
  buildRestorePayload,
  buildDeletePayload,
};
