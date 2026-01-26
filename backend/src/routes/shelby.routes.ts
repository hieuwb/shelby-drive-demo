import express from "express";
import {
  uploadFile,
  uploadMiddleware,
  buildAddFilePayload,
  downloadFile,
  listFiles,
  buildToggleStarPayload,
  buildMoveToTrashPayload,
  buildRestorePayload,
  buildDeletePayload,
} from "../controllers/shelby.controller";

const router = express.Router();

// Upload file to Shelby network
router.post("/upload", uploadMiddleware, uploadFile);

// Build transaction payloads
router.post("/transaction/add-file", buildAddFilePayload);
router.post("/transaction/toggle-star", buildToggleStarPayload);
router.post("/transaction/move-to-trash", buildMoveToTrashPayload);
router.post("/transaction/restore", buildRestorePayload);
router.post("/transaction/delete", buildDeletePayload);

// Download file from Shelby
router.get("/download", downloadFile);

// List files (from blockchain view function)
router.get("/files", listFiles);

export default router;
