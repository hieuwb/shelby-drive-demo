import { Request, Response } from "express";
import * as driveService from "../services/drive.service.v2";
import * as transactionService from "../services/transaction.service.v2";

// Plan: normalize route/query primitives first, then call typed services only with validated strings/numbers.
function getSingleString(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export async function getDriveController(req: Request, res: Response) {
  try {
    const address = getSingleString(req.params.address);
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const drive = await driveService.getDrive(address);
    res.json(drive);
  } catch (error: any) {
    console.error("Error getting drive:", error);
    res.status(500).json({ error: error.message || "Failed to get drive" });
  }
}

export async function getFilesInFolderController(req: Request, res: Response) {
  try {
    const address = getSingleString(req.params.address);
    const folderIdRaw = getSingleString(req.query.folderId as string | string[] | undefined);
    
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const files = await driveService.getFilesInFolder(address, Number(folderIdRaw) || 0);
    res.json(files);
  } catch (error: any) {
    console.error("Error getting files in folder:", error);
    res.status(500).json({ error: error.message || "Failed to get files" });
  }
}

export async function getStarredFilesController(req: Request, res: Response) {
  try {
    const address = getSingleString(req.params.address);
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const files = await driveService.getStarredFiles(address);
    res.json(files);
  } catch (error: any) {
    console.error("Error getting starred files:", error);
    res.status(500).json({ error: error.message || "Failed to get starred files" });
  }
}

export async function getTrashFilesController(req: Request, res: Response) {
  try {
    const address = getSingleString(req.params.address);
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const files = await driveService.getTrashFiles(address);
    res.json(files);
  } catch (error: any) {
    console.error("Error getting trash files:", error);
    res.status(500).json({ error: error.message || "Failed to get trash files" });
  }
}

export async function getRecentFilesController(req: Request, res: Response) {
  try {
    const address = getSingleString(req.params.address);
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const files = await driveService.getRecentFiles(address);
    res.json(files);
  } catch (error: any) {
    console.error("Error getting recent files:", error);
    res.status(500).json({ error: error.message || "Failed to get recent files" });
  }
}

export async function addFileController(req: Request, res: Response) {
  try {
    const { folderId, name, blobId, size, mimeType } = req.body;

    if (!name || !blobId || size === undefined || !mimeType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const txPayload = transactionService.buildAddFileTransaction({
      folderId: folderId || 0,
      name,
      blobId,
      size,
      mimeType,
    });

    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building add file transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function renameFileController(req: Request, res: Response) {
  try {
    const { fileId, newName } = req.body;

    if (!fileId || !newName) {
      return res.status(400).json({ error: "fileId and newName are required" });
    }

    const txPayload = transactionService.buildRenameFileTransaction({ fileId, newName });
    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building rename transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function toggleStarController(req: Request, res: Response) {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const txPayload = transactionService.buildToggleStarTransaction({ fileId });
    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building toggle star transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function moveToTrashController(req: Request, res: Response) {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const txPayload = transactionService.buildMoveToTrashTransaction({ fileId });
    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building move to trash transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function restoreFromTrashController(req: Request, res: Response) {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const txPayload = transactionService.buildRestoreFromTrashTransaction({ fileId });
    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building restore transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function deletePermanentlyController(req: Request, res: Response) {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const txPayload = transactionService.buildDeletePermanentlyTransaction({ fileId });
    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building delete permanently transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function moveFileController(req: Request, res: Response) {
  try {
    const { fileId, newFolderId } = req.body;

    if (!fileId || newFolderId === undefined) {
      return res.status(400).json({ error: "fileId and newFolderId are required" });
    }

    const txPayload = transactionService.buildMoveFileTransaction({ fileId, newFolderId });
    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building move file transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function createFolderController(req: Request, res: Response) {
  try {
    const { parentId, name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const txPayload = transactionService.buildCreateFolderTransaction({
      parentId: parentId || 0,
      name,
    });

    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building create folder transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function shareDriveController(req: Request, res: Response) {
  try {
    const { sharedWith, canEdit, canDelete } = req.body;

    if (!sharedWith) {
      return res.status(400).json({ error: "sharedWith address is required" });
    }

    const txPayload = transactionService.buildShareDriveTransaction({
      sharedWith,
      canEdit: canEdit || false,
      canDelete: canDelete || false,
    });

    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building share drive transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}

export async function unshareController(req: Request, res: Response) {
  try {
    const { sharedWith } = req.body;

    if (!sharedWith) {
      return res.status(400).json({ error: "sharedWith address is required" });
    }

    const txPayload = transactionService.buildUnshareTransaction({ sharedWith });
    res.json(txPayload);
  } catch (error: any) {
    console.error("Error building unshare transaction:", error);
    res.status(500).json({ error: error.message || "Failed to build transaction" });
  }
}
