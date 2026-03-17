# Shelby Drive v2 - Decentralized Storage on Aptos

## 🚀 Overview

Shelby Drive v2 is a decentralized storage application reimagined with full features similar to Google Drive, built on:
- **Blockchain**: Aptos (testnet default, Shelbynet optional via env)
- **Smart Contract**: Move language
- **Off-chain Storage**: Walrus/Local backend
- **Frontend**: Next.js 16 + React 19 + Aptos Wallet Adapter

## ✨ Key Features

### 📁 File Management
- ✅ Upload files to blockchain metadata + off-chain storage
- ✅ Download files from blob storage
- ✅ Rename files (metadata update on-chain)
- ✅ Move files between folders
- ✅ Star/Unstar files (mark as favorite)
- ✅ Soft delete (move to trash)
- ✅ Restore from trash
- ✅ Permanent delete

### 📂 Folder Management
- ✅ Create folders with hierarchical structure (parent/child)
- ✅ Move files across folders
- ✅ View files within specific folders

### 👥 Sharing
- ✅ Share drive with others (with edit/delete permissions)
- ✅ View shared drives
- ✅ Unshare (revoke access)

### 📊 Views
- ✅ **My Drive**: View all your files
- ✅ **Starred**: Favorite files
- ✅ **Recent**: 20 most recently accessed files
- ✅ **Shared with me**: Drives shared with you
- ✅ **Trash**: Deleted files (auto-delete after 30 days)

### 💰 Token Balance & Storage
- ✅ Display APT balance
- ✅ Display SHELBY token balance
- ✅ Storage tracking with 30GB limit per user
- ✅ Visual progress bar

## 🏗️ Smart Contract Architecture

The core logic is implemented in Move language with the following key structures:

### FileRecord
```move
struct FileRecord {
    id: u64,                    // Unique file ID
    name: vector<u8>,           // File name
    blob_id: vector<u8>,        // Off-chain storage reference
    size: u64,                  // File size in bytes
    extension: vector<u8>,      // File extension
    mime_type: vector<u8>,      // MIME type
    is_encrypted: bool,         // Encryption status
    is_starred: bool,           // Starred/favorite
    is_deleted: bool,           // Soft delete flag
    folder_id: u64,             // Parent folder ID
    created_at: u64,            // Creation timestamp
    modified_at: u64,           // Last modified timestamp
    deleted_at: u64,            // Deletion timestamp
    owner: address,             // File owner
}
```

### Drive Resource
```move
struct Drive {
    owner: address,                      // Drive owner
    files: vector<FileRecord>,           // All files
    folders: vector<Folder>,             // All folders
    shared_with: vector<SharePermission>,// Share permissions
    next_file_id: u64,                   // Auto-increment ID
    total_size: u64,                     // Total storage used
    storage_limit: u64,                  // Storage limit (30GB)
}
```

## 📝 Smart Contract Functions

### Entry Functions (Requires wallet signature)
1.  **initialize_drive**: Initialize drive resource for new user
2.  **add_file**: Add file metadata after upload
3.  **create_folder**: Create new folder
4.  **toggle_star**: Toggle star status
5.  **move_to_trash**: Move file to trash
6.  **restore_from_trash**: Restore file from trash
7.  **delete_permanently**: Permanently delete file
8.  **rename_file**: Rename file
9.  **share_drive**: Share drive access
10. **unshare_drive**: Revoke share access

## 📱 Usage Guide

### First Time Setup
1.  Connect your Aptos Wallet (Petra, Martian, etc.).
2.  Click "Upload" to initialize your drive (First transaction requires initialization).
3.  Start uploading files via the sidebar.

### Uploading Files
1.  Click the "Upload" button.
2.  Select a file from your device.
3.  Sign the transaction to save metadata to the blockchain.

### Sharing
1.  Right-click a file or folder and select "Share".
2.  Enter the recipient's wallet address.
3.  Select permissions (View/Edit/Delete).
4.  Sign the transaction.

## 🚦 Deployment

### 1. Deploy Smart Contract
```bash
cd backend/move
aptos move compile
aptos move publish --profile default
```

### 2. Configure & Run Backend
Update `.env` with your new `MODULE_ADDR`:
```bash
cd backend
npm run dev
```

### 3. Configure & Run Frontend
Update `MODULE_ADDRESS` in `frontend/abi/config.ts`:
```bash
cd frontend
npm run dev
```

## 📬 Contact & Support

For any questions or contributions, please contact us:

-   **X (Twitter)**: [WBteamz](https://twitter.com/WBteamz)
-   **Discord**: hieuwb
-   **Email**: pmhieu111@gmail.com

---

Created by **hieuwb**
