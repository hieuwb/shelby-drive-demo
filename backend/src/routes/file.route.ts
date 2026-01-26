import { Router } from "express";
import { uploadFileController, downloadFileController } from "../controllers/file.controller";
import { upload } from "../config/multer.config";

const router = Router();

// POST /api/file/upload - Upload a file
router.post("/upload", upload.single("file"), uploadFileController);

// GET /api/file/download/:blobId - Download a file by blobId
router.get("/download/:blobId", downloadFileController);

// GET /api/file/download?blobId=... - Download a file by blobId (query parameter)
router.get("/download", downloadFileController);

export default router;
