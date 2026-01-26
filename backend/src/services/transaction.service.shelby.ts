import { stringToHex } from "../utils/hex";

const MODULE_ADDR = process.env.MODULE_ADDR!;
const MODULE_NAME = "drive";

export interface AddFileParams {
  shelbyBlobName: string;  // full blob name from Shelby
  fileName: string;        // display name
  size: number;
  mimeType: string;
  folderId: number;
}

/**
 * Build transaction payload for adding a file to drive
 * Matches the new contract signature:
 * public entry fun add_file(
 *   account: &signer,
 *   shelby_blob_name: vector<u8>,
 *   name: vector<u8>,
 *   size: u64,
 *   mime_type: vector<u8>,
 *   folder_id: u64,
 * )
 */
export async function buildAddFileTransaction(
  accountAddress: string,
  params: AddFileParams
) {
  try {
    if (!MODULE_ADDR || MODULE_ADDR === '0x0') {
      throw new Error("MODULE_ADDR environment variable is not set correctly");
    }

    const { shelbyBlobName, fileName, size, mimeType, folderId } = params;

    // Convert strings to hex (vector<u8> in Move)
    const shelbyBlobNameHex = stringToHex(shelbyBlobName);
    const nameHex = stringToHex(fileName);
    const mimeTypeHex = stringToHex(mimeType);

    const payload = {
      function: `${MODULE_ADDR}::${MODULE_NAME}::add_file`,
      typeArguments: [],
      functionArguments: [
        String(shelbyBlobNameHex),
        String(nameHex),
        Number(size),
        String(mimeTypeHex),
        Number(folderId),
      ],
    };

    return {
      payload,
      moduleAddress: MODULE_ADDR,
      moduleName: MODULE_NAME,
      functionName: "add_file",
    };
  } catch (error: any) {
    throw new Error(String(error?.message || error));
  }
}

/**
 * Toggle star status for a file
 */
export async function buildToggleStarTransaction(
  accountAddress: string,
  fileId: number
) {
  const payload = {
    function: `${MODULE_ADDR}::${MODULE_NAME}::toggle_star`,
    typeArguments: [],
    functionArguments: [Number(fileId)],
  };

  return { payload, moduleAddress: MODULE_ADDR, moduleName: MODULE_NAME, functionName: "toggle_star" };
}

/**
 * Move file to trash
 */
export async function buildMoveToTrashTransaction(
  accountAddress: string,
  fileId: number
) {
  const payload = {
    function: `${MODULE_ADDR}::${MODULE_NAME}::move_to_trash`,
    typeArguments: [],
    functionArguments: [Number(fileId)],
  };

  return { payload, moduleAddress: MODULE_ADDR, moduleName: MODULE_NAME, functionName: "move_to_trash" };
}

/**
 * Restore file from trash
 */
export async function buildRestoreFromTrashTransaction(
  accountAddress: string,
  fileId: number
) {
  const payload = {
    function: `${MODULE_ADDR}::${MODULE_NAME}::restore_from_trash`,
    typeArguments: [],
    functionArguments: [Number(fileId)],
  };

  return { payload, moduleAddress: MODULE_ADDR, moduleName: MODULE_NAME, functionName: "restore_from_trash" };
}

/**
 * Permanently delete file
 */
export async function buildDeleteFileTransaction(
  accountAddress: string,
  fileId: number
) {
  const payload = {
    function: `${MODULE_ADDR}::${MODULE_NAME}::delete_file`,
    typeArguments: [],
    functionArguments: [Number(fileId)],
  };

  return { payload, moduleAddress: MODULE_ADDR, moduleName: MODULE_NAME, functionName: "delete_file" };
}

/**
 * Create folder
 */
export async function buildCreateFolderTransaction(
  accountAddress: string,
  folderName: string,
  parentId: number
) {
  const nameHex = stringToHex(folderName);

  const payload = {
    function: `${MODULE_ADDR}::${MODULE_NAME}::create_folder`,
    typeArguments: [],
    functionArguments: [String(nameHex), Number(parentId)],
  };

  return { payload, moduleAddress: MODULE_ADDR, moduleName: MODULE_NAME, functionName: "create_folder" };
}

/**
 * Share drive with another user
 */
export async function buildShareDriveTransaction(
  accountAddress: string,
  recipientAddress: string,
  canEdit: boolean
) {
  const payload = {
    function: `${MODULE_ADDR}::${MODULE_NAME}::share_drive`,
    typeArguments: [],
    functionArguments: [String(recipientAddress), Boolean(canEdit)],
  };

  return { payload, moduleAddress: MODULE_ADDR, moduleName: MODULE_NAME, functionName: "share_drive" };
}

export default {
  buildAddFileTransaction,
  buildToggleStarTransaction,
  buildMoveToTrashTransaction,
  buildRestoreFromTrashTransaction,
  buildDeleteFileTransaction,
  buildCreateFolderTransaction,
  buildShareDriveTransaction,
};
