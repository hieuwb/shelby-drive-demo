import { Request, Response } from "express";
import { getDrive } from "../services/drive.service";
import { 
  buildAddFileTransaction, 
  buildDeleteFileTransaction,
  buildShareDriveTransaction,
  AddFileParams,
  DeleteFileParams,
  ShareDriveParams
} from "../services/transaction.service";

export const getDriveController = async (req: Request, res: Response) => {
  try {
    // Support both path parameter and query parameter
    const address = req.params.address || req.query.address;

    if (typeof address !== "string") {
      return res.status(400).json({
        error: "address is required and must be a string (use /api/drive/:address or /api/drive?address=...)",
      });
    }

    const drive = await getDrive(address);

    // Ensure we always return valid JSON
    if (drive === undefined || drive === null) {
      console.warn(`Drive data is ${drive} for address: ${address}`);
      return res.status(404).json({
        error: "Drive data not found",
        address: address,
      });
    }

    return res.json(drive);
  } catch (error: any) {
    console.error("Error in getDriveController:", error);
    
    // Handle specific Aptos errors
    if (error?.status === 404 || error?.message?.includes("Resource not found")) {
      return res.status(404).json({
        error: "Drive resource not found for the given address",
        address: req.params.address || req.query.address,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: error?.message || "An unexpected error occurred",
    });
  }
};

export const addFileController = async (req: Request, res: Response) => {
  try {
    const { accountAddress, folderIndex, fileName, blobId, size, extension, isEncrypted } = req.body;

    // Validate required fields
    if (!accountAddress) {
      return res.status(400).json({
        error: "accountAddress is required",
      });
    }

    if (fileName === undefined || blobId === undefined || size === undefined || extension === undefined) {
      return res.status(400).json({
        error: "fileName, blobId, size, and extension are required",
      });
    }

    const params: AddFileParams = {
      folderIndex: folderIndex !== undefined ? Number(folderIndex) : 0, // Default to root folder (index 0)
      fileName: String(fileName),
      blobId: String(blobId),
      size: Number(size),
      extension: String(extension),
      isEncrypted: isEncrypted === true || isEncrypted === "true",
    };

    console.log(`Building transaction for adding file: ${params.fileName} to account: ${accountAddress}`);

    let transactionPayload;
    try {
      transactionPayload = await buildAddFileTransaction(accountAddress, params);
    } catch (buildError: any) {
      console.error("Build error details:", buildError);
      throw buildError;
    }

    return res.json({
      success: true,
      accountAddress,
      // Payload for frontend to use with Petra wallet
      payload: transactionPayload.payload,
      // Meta information
      meta: {
        moduleAddress: transactionPayload.moduleAddress,
        moduleName: transactionPayload.moduleName,
        functionName: transactionPayload.functionName,
      },
    });
  } catch (error: any) {
    // Safely log error without serializing the whole object
    const errorMsg = error?.message || String(error) || "An unexpected error occurred";
    console.error("Error in addFileController:", errorMsg);
    
    return res.status(500).json({
      error: "Failed to build transaction",
      message: errorMsg,
    });
  }
};

export const deleteFileController = async (req: Request, res: Response) => {
  try {
    const { accountAddress, folderIndex, fileIndex } = req.body;

    if (!accountAddress) {
      return res.status(400).json({
        error: "accountAddress is required",
      });
    }

    if (folderIndex === undefined || fileIndex === undefined) {
      return res.status(400).json({
        error: "folderIndex and fileIndex are required",
      });
    }

    const params: DeleteFileParams = {
      folderIndex: Number(folderIndex),
      fileIndex: Number(fileIndex),
    };

    console.log(`Building transaction for deleting file at folder ${params.folderIndex}, file ${params.fileIndex}`);

    const transactionPayload = await buildDeleteFileTransaction(accountAddress, params);

    return res.json({
      success: true,
      accountAddress,
      payload: transactionPayload.payload,
      meta: {
        moduleAddress: transactionPayload.moduleAddress,
        moduleName: transactionPayload.moduleName,
        functionName: transactionPayload.functionName,
      },
    });
  } catch (error: any) {
    const errorMsg = error?.message || String(error) || "An unexpected error occurred";
    console.error("Error in deleteFileController:", errorMsg);
    
    return res.status(500).json({
      error: "Failed to build delete transaction",
      message: errorMsg,
    });
  }
};

export const shareDriveController = async (req: Request, res: Response) => {
  try {
    const { accountAddress, recipientAddress } = req.body;

    if (!accountAddress) {
      return res.status(400).json({
        error: "accountAddress is required",
      });
    }

    if (!recipientAddress) {
      return res.status(400).json({
        error: "recipientAddress is required",
      });
    }

    const params: ShareDriveParams = {
      recipientAddress: String(recipientAddress),
    };

    console.log(`Building transaction for sharing drive with ${params.recipientAddress}`);

    const transactionPayload = await buildShareDriveTransaction(accountAddress, params);

    return res.json({
      success: true,
      accountAddress,
      payload: transactionPayload.payload,
      meta: {
        moduleAddress: transactionPayload.moduleAddress,
        moduleName: transactionPayload.moduleName,
        functionName: transactionPayload.functionName,
      },
    });
  } catch (error: any) {
    const errorMsg = error?.message || String(error) || "An unexpected error occurred";
    console.error("Error in shareDriveController:", errorMsg);
    
    return res.status(500).json({
      error: "Failed to build share transaction",
      message: errorMsg,
    });
  }
};
