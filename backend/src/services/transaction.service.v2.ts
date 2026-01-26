import { stringToHex } from "../utils/hex";

const MODULE_ADDR = process.env.MODULE_ADDR || "0x0f99087870768927070b364eb50e505a44755df7e6beb7b0b3d4ecc98c15bbad";
const MODULE_NAME = "drive";

export interface AddFileParams {
  folderId: number;
  name: string;
  blobId: string;
  size: number;
  extension: string;
  mimeType: string;
  isEncrypted: boolean;
}

export interface RenameFileParams {
  fileId: number;
  newName: string;
}

export interface ToggleStarParams {
  fileId: number;
}

export interface MoveToTrashParams {
  fileId: number;
}

export interface RestoreFromTrashParams {
  fileId: number;
}

export interface DeletePermanentlyParams {
  fileId: number;
}

export interface MoveFileParams {
  fileId: number;
  newFolderId: number;
}

export interface CreateFolderParams {
  parentId: number;
  name: string;
}

export interface ShareDriveParams {
  sharedWith: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UnshareParams {
  sharedWith: string;
}

export const buildInitializeDriveTransaction = () => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::initialize_drive`,
      typeArguments: [],
      functionArguments: [],
    },
  };
};

export const buildAddFileTransaction = (params: AddFileParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::add_file`,
      typeArguments: [],
      functionArguments: [
        params.folderId,
        stringToHex(params.name),
        stringToHex(params.blobId),
        params.size,
        stringToHex(params.extension),
        stringToHex(params.mimeType),
        params.isEncrypted,
      ],
    },
  };
};

export const buildRenameFileTransaction = (params: RenameFileParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::rename_file`,
      typeArguments: [],
      functionArguments: [
        params.fileId,
        stringToHex(params.newName),
      ],
    },
  };
};

export const buildToggleStarTransaction = (params: ToggleStarParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::toggle_star`,
      typeArguments: [],
      functionArguments: [params.fileId],
    },
  };
};

export const buildMoveToTrashTransaction = (params: MoveToTrashParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::move_to_trash`,
      typeArguments: [],
      functionArguments: [params.fileId],
    },
  };
};

export const buildRestoreFromTrashTransaction = (params: RestoreFromTrashParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::restore_from_trash`,
      typeArguments: [],
      functionArguments: [params.fileId],
    },
  };
};

export const buildDeletePermanentlyTransaction = (params: DeletePermanentlyParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::delete_permanently`,
      typeArguments: [],
      functionArguments: [params.fileId],
    },
  };
};

export const buildMoveFileTransaction = (params: MoveFileParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::move_file`,
      typeArguments: [],
      functionArguments: [params.fileId, params.newFolderId],
    },
  };
};

export const buildCreateFolderTransaction = (params: CreateFolderParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::create_folder`,
      typeArguments: [],
      functionArguments: [
        params.parentId,
        stringToHex(params.name),
      ],
    },
  };
};

export const buildShareDriveTransaction = (params: ShareDriveParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::share_drive`,
      typeArguments: [],
      functionArguments: [
        params.sharedWith,
        params.canEdit,
        params.canDelete,
      ],
    },
  };
};

export const buildUnshareTransaction = (params: UnshareParams) => {
  return {
    payload: {
      function: `${MODULE_ADDR}::${MODULE_NAME}::unshare_drive`,
      typeArguments: [],
      functionArguments: [params.sharedWith],
    },
  };
};
