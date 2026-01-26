/**
 * API Configuration and Client Functions
 * Handles all backend API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://77.42.24.95:3000';

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Fetch wrapper with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle file downloads (blob responses)
  if (options.headers && 'Content-Type' in options.headers && 
      options.headers['Content-Type'] === 'application/octet-stream') {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.message || error.error || 'Download failed');
    }
    return response.blob() as unknown as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'API request failed');
  }

  return data;
}

// ==================== DRIVE API ====================

export interface DriveFile {
  name: string;
  blobId: string;
  extension: string;
  size: number;
  encrypted: boolean;
  createdAt: string;
}

export interface DriveFolder {
  name: string;
  files: DriveFile[];
}

export interface Drive {
  owner: string;
  folders: DriveFolder[];
  shared_with?: string[];
}

/**
 * Get drive data for an address
 */
export async function getDrive(address: string): Promise<Drive> {
  return apiRequest<Drive>(`/api/drive/${encodeURIComponent(address)}`);
}

/**
 * Build transaction payload for adding a file to drive
 */
export interface AddFileParams {
  accountAddress: string;
  folderIndex?: number;
  fileName: string;
  blobId: string;
  size: number;
  extension: string;
  isEncrypted?: boolean;
}

export interface TransactionPayload {
  success: boolean;
  accountAddress: string;
  payload: {
    function: string;
    typeArguments: string[];
    functionArguments: any[];
  };
  meta: {
    moduleAddress: string;
    moduleName: string;
    functionName: string;
  };
}

export async function buildAddFileTransaction(
  params: AddFileParams
): Promise<TransactionPayload> {
  return apiRequest<TransactionPayload>('/api/drive/add-file', {
    method: 'POST',
    body: JSON.stringify({
      accountAddress: params.accountAddress,
      folderIndex: params.folderIndex || 0,
      fileName: params.fileName,
      blobId: params.blobId,
      size: params.size,
      extension: params.extension,
      isEncrypted: params.isEncrypted || false,
    }),
  });
}

/**
 * Build transaction payload for deleting a file
 */
export interface DeleteFileParams {
  accountAddress: string;
  folderIndex: number;
  fileIndex: number;
}

export async function buildDeleteFileTransaction(
  params: DeleteFileParams
): Promise<TransactionPayload> {
  return apiRequest<TransactionPayload>('/api/drive/delete-file', {
    method: 'POST',
    body: JSON.stringify({
      accountAddress: params.accountAddress,
      folderIndex: params.folderIndex,
      fileIndex: params.fileIndex,
    }),
  });
}

/**
 * Build transaction payload for sharing drive
 */
export interface ShareDriveParams {
  accountAddress: string;
  recipientAddress: string;
}

export async function buildShareDriveTransaction(
  params: ShareDriveParams
): Promise<TransactionPayload> {
  return apiRequest<TransactionPayload>('/api/drive/share', {
    method: 'POST',
    body: JSON.stringify({
      accountAddress: params.accountAddress,
      recipientAddress: params.recipientAddress,
    }),
  });
}

// ==================== FILE API ====================

export interface UploadFileResponse {
  success: boolean;
  blobId: string;
  fileName: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a file to backend
 */
export async function uploadFile(file: File): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/file/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.message || error.error || 'Upload failed');
  }

  return response.json();
}

/**
 * Download a file by blobId
 */
export async function downloadFile(blobId: string): Promise<Blob> {
  const encodedBlobId = encodeURIComponent(blobId);
  const response = await fetch(
    `${API_BASE_URL}/api/file/download?blobId=${encodedBlobId}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(error.message || error.error || 'Download failed');
  }

  return response.blob();
}

/**
 * Download file and trigger browser download
 */
export async function downloadFileAs(
  blobId: string,
  fileName: string
): Promise<void> {
  const blob = await downloadFile(blobId);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Export API base URL for direct use if needed
export { API_BASE_URL };
