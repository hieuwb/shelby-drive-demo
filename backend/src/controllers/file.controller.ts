import { Request, Response } from "express";
import { uploadToShelbyBlob, downloadFile } from "../services/file.service";
import * as path from "path";

export const uploadFileController = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file provided",
      });
    }

    console.log(`Uploading file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Upload file to storage (Shelby Blob or local)
    const blobId = await uploadToShelbyBlob(req.file);

    return res.json({
      success: true,
      blobId: blobId,
      fileName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error: any) {
    console.error("Error in uploadFileController:", error);
    
    return res.status(500).json({
      error: "Failed to upload file",
      message: error?.message || "An unexpected error occurred",
    });
  }
};

export const downloadFileController = async (req: Request, res: Response) => {
  try {
    // Support both path parameter and query parameter
    const blobId = req.params.blobId || req.query.blobId;

    if (!blobId || typeof blobId !== "string") {
      return res.status(400).json({
        error: "blobId is required (use /api/file/download/:blobId or /api/file/download?blobId=...)",
      });
    }

    console.log(`Downloading file with blobId: ${blobId}`);

    // Get file from storage
    const fileData = await downloadFile(blobId);

    // Determine content type based on file extension
    const ext = path.extname(fileData.originalName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".txt": "text/plain",
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".zip": "application/zip",
      ".json": "application/json",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Set headers for file download
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileData.originalName}"`);
    res.setHeader("Content-Length", fileData.size.toString());

    // Send file buffer
    res.send(fileData.buffer);
  } catch (error: any) {
    console.error("Error in downloadFileController:", error);
    
    if (error?.message?.includes("not found")) {
      return res.status(404).json({
        error: "File not found",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Failed to download file",
      message: error?.message || "An unexpected error occurred",
    });
  }
};
