import { getAptosClient } from "./aptos.service";
import { hexToString } from "../utils/hex";

interface RawFileRecord {
  id: string;
  name: string;
  blob_id: string;
  size: string;
  extension: string;
  mime_type: string;
  is_encrypted: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  folder_id: string;
  created_at: string;
  modified_at: string;
  deleted_at: string;
  owner: string;
}

interface RawFolder {
  id: string;
  name: string;
  parent_id: string;
  is_deleted: boolean;
  created_at: string;
  modified_at: string;
}

interface RawDrive {
  files: RawFileRecord[];
  folders: RawFolder[];
  total_size: string;
  storage_limit: string;
}

export interface FormattedFile {
  id: number;
  name: string;
  blobId: string;
  size: number;
  extension: string;
  mimeType: string;
  encrypted: boolean;
  starred: boolean;
  deleted: boolean;
  folderId: number;
  createdAt: string;
  modifiedAt: string;
  deletedAt?: string;
  owner: string;
}

export interface FormattedFolder {
  id: number;
  name: string;
  parentId: number;
  deleted: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface FormattedDrive {
  files: FormattedFile[];
  folders: FormattedFolder[];
  totalSize: number;
  storageLimit: number;
  usagePercent: number;
}

function formatFile(rawFile: RawFileRecord): FormattedFile {
  const name = hexToString(rawFile.name);
  const blobId = hexToString(rawFile.blob_id);
  const extension = hexToString(rawFile.extension);
  const mimeType = hexToString(rawFile.mime_type);
  
  return {
    id: parseInt(rawFile.id, 10),
    name,
    blobId,
    size: parseInt(rawFile.size, 10),
    extension,
    mimeType,
    encrypted: rawFile.is_encrypted,
    starred: rawFile.is_starred,
    deleted: rawFile.is_deleted,
    folderId: parseInt(rawFile.folder_id, 10),
    createdAt: new Date(parseInt(rawFile.created_at, 10) * 1000).toISOString(),
    modifiedAt: new Date(parseInt(rawFile.modified_at, 10) * 1000).toISOString(),
    deletedAt: rawFile.deleted_at !== "0" 
      ? new Date(parseInt(rawFile.deleted_at, 10) * 1000).toISOString() 
      : undefined,
    owner: rawFile.owner,
  };
}

function formatFolder(rawFolder: RawFolder): FormattedFolder {
  return {
    id: parseInt(rawFolder.id, 10),
    name: hexToString(rawFolder.name),
    parentId: parseInt(rawFolder.parent_id, 10),
    deleted: rawFolder.is_deleted,
    createdAt: new Date(parseInt(rawFolder.created_at, 10) * 1000).toISOString(),
    modifiedAt: new Date(parseInt(rawFolder.modified_at, 10) * 1000).toISOString(),
  };
}

export async function getDrive(account: string): Promise<FormattedDrive> {
  try {
    const aptos = getAptosClient();
    const MODULE_ADDR = process.env.MODULE_ADDR;
    const MODULE_NAME = "drive";

    if (!MODULE_ADDR) {
      throw new Error("MODULE_ADDR not configured");
    }

    // Call view function to get drive data
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDR}::${MODULE_NAME}::get_drive`,
        typeArguments: [],
        functionArguments: [account],
      },
    });

    if (!result || result.length < 4) {
      return {
        files: [],
        folders: [],
        totalSize: 0,
        storageLimit: 0,
        usagePercent: 0,
      };
    }

    const [files, folders, totalSize, storageLimit] = result as [
      RawFileRecord[],
      RawFolder[],
      string,
      string
    ];

    const total = parseInt(totalSize, 10);
    const limit = parseInt(storageLimit, 10);

    return {
      files: files.map(formatFile),
      folders: folders.map(formatFolder),
      totalSize: total,
      storageLimit: limit,
      usagePercent: limit > 0 ? (total / limit) * 100 : 0,
    };
  } catch (error: any) {
    console.error("Error getting drive:", error);
    throw error;
  }
}

export async function getFilesInFolder(account: string, folderId: number): Promise<FormattedFile[]> {
  try {
    const aptos = getAptosClient();
    const MODULE_ADDR = process.env.MODULE_ADDR;
    const MODULE_NAME = "drive";

    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDR}::${MODULE_NAME}::get_files_in_folder`,
        typeArguments: [],
        functionArguments: [account, folderId],
      },
    });

    if (!result || result.length === 0) {
      return [];
    }

    const files = result[0] as RawFileRecord[];
    return files.map(formatFile);
  } catch (error: any) {
    console.error("Error getting files in folder:", error);
    throw error;
  }
}

export async function getStarredFiles(account: string): Promise<FormattedFile[]> {
  try {
    const aptos = getAptosClient();
    const MODULE_ADDR = process.env.MODULE_ADDR;
    const MODULE_NAME = "drive";

    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDR}::${MODULE_NAME}::get_starred_files`,
        typeArguments: [],
        functionArguments: [account],
      },
    });

    if (!result || result.length === 0) {
      return [];
    }

    const files = result[0] as RawFileRecord[];
    return files.map(formatFile);
  } catch (error: any) {
    console.error("Error getting starred files:", error);
    throw error;
  }
}

export async function getTrashFiles(account: string): Promise<FormattedFile[]> {
  try {
    const aptos = getAptosClient();
    const MODULE_ADDR = process.env.MODULE_ADDR;
    const MODULE_NAME = "drive";

    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDR}::${MODULE_NAME}::get_trash_files`,
        typeArguments: [],
        functionArguments: [account],
      },
    });

    if (!result || result.length === 0) {
      return [];
    }

    const files = result[0] as RawFileRecord[];
    return files.map(formatFile);
  } catch (error: any) {
    console.error("Error getting trash files:", error);
    throw error;
  }
}

export async function getRecentFiles(account: string): Promise<FormattedFile[]> {
  try {
    const aptos = getAptosClient();
    const MODULE_ADDR = process.env.MODULE_ADDR;
    const MODULE_NAME = "drive";

    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDR}::${MODULE_NAME}::get_recent_files`,
        typeArguments: [],
        functionArguments: [account],
      },
    });

    if (!result || result.length === 0) {
      return [];
    }

    const files = result[0] as RawFileRecord[];
    return files.map(formatFile);
  } catch (error: any) {
    console.error("Error getting recent files:", error);
    throw error;
  }
}
