import { getAptosClient } from "./aptos.service";
import { hexToString } from "../utils/hex";

interface RawFile {
  name: string;
  blob_id: string;
  extension: string;
  size: string;
  is_encrypted: boolean;
  created_at: string;
}

interface RawFolder {
  name: string;
  files: RawFile[];
}

interface RawDrive {
  owner: string;
  folders: RawFolder[];
  shared_with: string[];
}

interface FormattedFile {
  name: string;
  blobId: string;
  extension: string;
  size: number;
  encrypted: boolean;
  createdAt: string;
}

interface FormattedFolder {
  name: string;
  files: FormattedFile[];
}

interface FormattedDrive {
  owner: string;
  folders: FormattedFolder[];
  shared_with?: string[];
}

function formatFile(rawFile: RawFile): FormattedFile {
  const name = hexToString(rawFile.name);
  const blobId = hexToString(rawFile.blob_id);
  const extension = hexToString(rawFile.extension);
  
  // Debug logging
  if (blobId.startsWith('0x') || blobId.includes('0x')) {
    console.warn('⚠️  BlobId still contains hex:', blobId);
    console.warn('Raw blob_id:', rawFile.blob_id);
  }
  
  return {
    name,
    blobId,
    extension,
    size: parseInt(rawFile.size, 10),
    encrypted: rawFile.is_encrypted,
    createdAt: new Date(parseInt(rawFile.created_at, 10) * 1000).toISOString(),
  };
}

function formatFolder(rawFolder: RawFolder): FormattedFolder {
  return {
    name: hexToString(rawFolder.name),
    files: rawFolder.files.map(formatFile),
  };
}

function formatDrive(rawDrive: RawDrive): FormattedDrive {
  return {
    owner: rawDrive.owner,
    folders: rawDrive.folders.map(formatFolder),
    shared_with: rawDrive.shared_with || [],
  };
}

export async function getDrive(account: string): Promise<FormattedDrive> {
  const moduleAddr = process.env.MODULE_ADDR;
  const aptos = getAptosClient();
  
  if (!moduleAddr) {
    throw new Error("MODULE_ADDR environment variable is not set");
  }

  const resourceType = `${moduleAddr}::drive::Drive` as `${string}::${string}::${string}`;
  
  console.log(`Fetching drive resource for account: ${account}`);
  console.log(`Resource type: ${resourceType}`);

  const resource = await aptos.getAccountResource({
    accountAddress: account,
    resourceType: resourceType,
  });

  console.log("Resource retrieved:", resource ? "success" : "null/undefined");
  
  // Get raw data from resource
  const rawData = (resource?.data || resource) as RawDrive;
  
  if (!rawData || !rawData.folders) {
    throw new Error("Invalid drive data structure");
  }

  // Format and decode hex data
  const formattedDrive = formatDrive(rawData);
  console.log("Drive formatted successfully");

  return formattedDrive;
}
