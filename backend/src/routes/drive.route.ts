import { Router } from "express";
import { 
  getDriveController, 
  addFileController,
  deleteFileController,
  shareDriveController
} from "../controllers/drive.controller";

const router = Router();

router.get("/:address", getDriveController);
router.get("/", getDriveController);

// POST /api/drive/add-file - Build transaction payload for adding file
router.post("/add-file", addFileController);

// POST /api/drive/delete-file - Build transaction payload for deleting file
router.post("/delete-file", deleteFileController);

// POST /api/drive/share - Build transaction payload for sharing drive
router.post("/share", shareDriveController);

export default router;
