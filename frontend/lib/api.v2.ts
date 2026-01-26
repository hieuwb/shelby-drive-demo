const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://77.42.24.95:3000"

export interface TransactionPayload {
  payload: {
    function: string
    typeArguments: string[]
    functionArguments: any[]
  }
}

export interface File {
  id: number
  name: string
  blobId: string
  size: number
  extension: string
  mimeType: string
  encrypted: boolean
  starred: boolean
  deleted: boolean
  folderId: number
  createdAt: string
  modifiedAt: string
  deletedAt?: string
  owner: string
}

export interface Folder {
  id: number
  name: string
  parentId: number
  deleted: boolean
  createdAt: string
  modifiedAt: string
}

export interface Drive {
  files: File[]
  folders: Folder[]
  totalSize: number
  storageLimit: number
  usagePercent: number
}

// ============ DRIVE DATA FETCHING ============

export async function getDrive(address: string): Promise<Drive> {
  const response = await fetch(`${API_BASE_URL}/api/drive/${address}`)
  if (!response.ok) {
    throw new Error("Failed to fetch drive data")
  }
  return response.json()
}

export async function getFilesInFolder(address: string, folderId: number): Promise<File[]> {
  const response = await fetch(`${API_BASE_URL}/api/drive/${address}/folder?folderId=${folderId}`)
  if (!response.ok) {
    throw new Error("Failed to fetch folder files")
  }
  return response.json()
}

export async function getStarredFiles(address: string): Promise<File[]> {
  const response = await fetch(`${API_BASE_URL}/api/drive/${address}/starred`)
  if (!response.ok) {
    throw new Error("Failed to fetch starred files")
  }
  return response.json()
}

export async function getTrashFiles(address: string): Promise<File[]> {
  const response = await fetch(`${API_BASE_URL}/api/drive/${address}/trash`)
  if (!response.ok) {
    throw new Error("Failed to fetch trash files")
  }
  return response.json()
}

export async function getRecentFiles(address: string): Promise<File[]> {
  const response = await fetch(`${API_BASE_URL}/api/drive/${address}/recent`)
  if (!response.ok) {
    throw new Error("Failed to fetch recent files")
  }
  return response.json()
}

// ============ FILE UPLOAD/DOWNLOAD ============

export async function uploadFile(file: File): Promise<{ blobId: string; size: number }> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE_URL}/api/file/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Failed to upload file")
  }

  return response.json()
}

export async function downloadFileAs(blobId: string, fileName: string) {
  const response = await fetch(`${API_BASE_URL}/api/file/download?blobId=${encodeURIComponent(blobId)}`)
  
  if (!response.ok) {
    throw new Error("Failed to download file")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============ TRANSACTION BUILDERS ============

export async function buildAddFileTransaction(params: {
  folderId: number
  name: string
  blobId: string
  size: number
  extension: string
  mimeType: string
  isEncrypted: boolean
}): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/add-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error("Failed to build add file transaction")
  }

  return response.json()
}

export async function buildRenameFileTransaction(params: {
  fileId: number
  newName: string
}): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error("Failed to build rename transaction")
  }

  return response.json()
}

export async function buildToggleStarTransaction(fileId: number): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/toggle-star`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  })

  if (!response.ok) {
    throw new Error("Failed to build toggle star transaction")
  }

  return response.json()
}

export async function buildMoveToTrashTransaction(fileId: number): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/move-to-trash`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  })

  if (!response.ok) {
    throw new Error("Failed to build move to trash transaction")
  }

  return response.json()
}

export async function buildRestoreFromTrashTransaction(fileId: number): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  })

  if (!response.ok) {
    throw new Error("Failed to build restore transaction")
  }

  return response.json()
}

export async function buildDeletePermanentlyTransaction(fileId: number): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/delete-permanently`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  })

  if (!response.ok) {
    throw new Error("Failed to build delete permanently transaction")
  }

  return response.json()
}

export async function buildMoveFileTransaction(params: {
  fileId: number
  newFolderId: number
}): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/move-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error("Failed to build move file transaction")
  }

  return response.json()
}

export async function buildCreateFolderTransaction(params: {
  parentId: number
  name: string
}): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/create-folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error("Failed to build create folder transaction")
  }

  return response.json()
}

export async function buildShareDriveTransaction(params: {
  sharedWith: string
  canEdit: boolean
  canDelete: boolean
}): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error("Failed to build share transaction")
  }

  return response.json()
}

export async function buildUnshareTransaction(sharedWith: string): Promise<TransactionPayload> {
  const response = await fetch(`${API_BASE_URL}/api/drive/unshare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sharedWith }),
  })

  if (!response.ok) {
    throw new Error("Failed to build unshare transaction")
  }

  return response.json()
}
