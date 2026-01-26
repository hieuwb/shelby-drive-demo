import { stringToHex } from "../utils/hex";

const MODULE_ADDR = process.env.MODULE_ADDR!;
const MODULE_NAME = "drive";

export interface AddFileParams {
  folderIndex: number;
  fileName: string;
  blobId: string;
  size: number;
  extension: string;
  isEncrypted: boolean;
}

export interface DeleteFileParams {
  folderIndex: number;
  fileIndex: number;
}

export interface ShareDriveParams {
  recipientAddress: string;
}

/**
 * Build transaction payload for adding a file to drive
 * This returns a payload that can be used by frontend to sign with Petra wallet
 */
export async function buildAddFileTransaction(
  accountAddress: string,
  params: AddFileParams
) {
  try {
    if (!MODULE_ADDR || MODULE_ADDR === '0x0') {
      throw new Error("MODULE_ADDR environment variable is not set correctly");
    }

    const { folderIndex, fileName, blobId, size, extension, isEncrypted } = params;

    // Convert strings to hex (vector<u8> in Move)
    const nameHex = stringToHex(fileName);
    const blobIdHex = stringToHex(blobId);
    const extensionHex = stringToHex(extension);

    // Build payload for frontend to use with Petra wallet
    // Frontend will build the transaction using Petra SDK
    const payload = {
      function: `${MODULE_ADDR}::${MODULE_NAME}::add_file`,
      typeArguments: [],
      functionArguments: [
        Number(folderIndex), // Ensure it's a number, not BigInt
        String(nameHex),
        String(blobIdHex),
        Number(size), // Ensure it's a number, not BigInt
        String(extensionHex),
        Boolean(isEncrypted),
      ],
    };

    return {
      // Raw payload for frontend to use directly with Petra wallet
      payload,
      // Helper info
      moduleAddress: MODULE_ADDR,
      moduleName: MODULE_NAME,
      functionName: "add_file",
    };
  } catch (error: any) {
    // Convert error to string to avoid BigInt serialization issues
    throw new Error(String(error?.message || error));
  }
}

/**
 * Build transaction payload for deleting a file
 */
export async function buildDeleteFileTransaction(
  accountAddress: string,
  params: DeleteFileParams
) {
  try {
    if (!MODULE_ADDR || MODULE_ADDR === '0x0') {
      throw new Error("MODULE_ADDR environment variable is not set correctly");
    }

    const { folderIndex, fileIndex } = params;

    const payload = {
      function: `${MODULE_ADDR}::${MODULE_NAME}::delete_file_record`,
      typeArguments: [],
      functionArguments: [
        Number(folderIndex),
        Number(fileIndex),
      ],
    };

    return {
      payload,
      moduleAddress: MODULE_ADDR,
      moduleName: MODULE_NAME,
      functionName: "delete_file_record",
    };
  } catch (error: any) {
    throw new Error(String(error?.message || error));
  }
}

/**
 * Build transaction payload for sharing drive with another address
 */
export async function buildShareDriveTransaction(
  accountAddress: string,
  params: ShareDriveParams
) {
  try {
    if (!MODULE_ADDR || MODULE_ADDR === '0x0') {
      throw new Error("MODULE_ADDR environment variable is not set correctly");
    }

    const { recipientAddress } = params;

    const payload = {
      function: `${MODULE_ADDR}::${MODULE_NAME}::share_drive`,
      typeArguments: [],
      functionArguments: [
        String(recipientAddress),
      ],
    };

    return {
      payload,
      moduleAddress: MODULE_ADDR,
      moduleName: MODULE_NAME,
      functionName: "share_drive",
    };
  } catch (error: any) {
    throw new Error(String(error?.message || error));
  }
}
