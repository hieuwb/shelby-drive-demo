/**
 * Temporary local storage for files until contract is properly deployed
 */

export interface FileMetadata {
  id: string;
  shelby_blob_name: string;
  name: string;
  size: number;
  mime_type: string;
  owner: string;
  created_at: number;
  modified_at: number;
}

const STORAGE_KEY = "shelby_drive_files";

export function saveFile(file: FileMetadata): void {
  const files = getFiles(file.owner);
  files.push(file);
  localStorage.setItem(`${STORAGE_KEY}_${file.owner}`, JSON.stringify(files));
}

export function getFiles(owner: string): FileMetadata[] {
  const data = localStorage.getItem(`${STORAGE_KEY}_${owner}`);
  return data ? JSON.parse(data) : [];
}

export function deleteFile(owner: string, fileId: string): void {
  const files = getFiles(owner).filter(f => f.id !== fileId);
  localStorage.setItem(`${STORAGE_KEY}_${owner}`, JSON.stringify(files));
}
