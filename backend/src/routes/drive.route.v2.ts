import { Router } from "express";
import * as driveController from "../controllers/drive.controller.v2";

const router = Router();

// View endpoints
router.get("/:address", driveController.getDriveController);
router.get("/:address/folder", driveController.getFilesInFolderController);
router.get("/:address/starred", driveController.getStarredFilesController);
router.get("/:address/trash", driveController.getTrashFilesController);
router.get("/:address/recent", driveController.getRecentFilesController);

// Transaction builders
router.post("/add-file", driveController.addFileController);
router.post("/rename", driveController.renameFileController);
router.post("/toggle-star", driveController.toggleStarController);
router.post("/move-to-trash", driveController.moveToTrashController);
router.post("/restore", driveController.restoreFromTrashController);
router.post("/delete-permanently", driveController.deletePermanentlyController);
router.post("/move-file", driveController.moveFileController);
router.post("/create-folder", driveController.createFolderController);
router.post("/share", driveController.shareDriveController);
router.post("/unshare", driveController.unshareController);

export default router;
