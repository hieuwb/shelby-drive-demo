import { Request } from "express";
import type { FileFilterCallback } from "multer";
const multer = require("multer");

// Configure multer to use memory storage (we'll handle file saving in service)
const storage = multer.memoryStorage();

// File filter to accept all file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Accept all file types for now
  // You can add validation here if needed
  cb(null, true);
};

// Multer configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});
