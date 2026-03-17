# Shelby Drive v2 - Google Drive Clone on Aptos

## 🚀 Tổng quan

Shelby Drive v2 là ứng dụng lưu trữ phi tập trung được xây dựng hoàn toàn mới với đầy đủ tính năng như Google Drive, sử dụng:
- **Blockchain**: Aptos (testnet default, Shelbynet optional via env)
- **Smart Contract**: Move language
- **Off-chain Storage**: Walrus/Local backend
- **Frontend**: Next.js 16 + React 19 + Aptos Wallet Adapter

## ✨ Tính năng chính

### 📁 Quản lý File
- ✅ Upload file lên blockchain + off-chain storage
- ✅ Download file từ blob storage
- ✅ Rename file (chỉ metadata on-chain)
- ✅ Move file giữa các folder
- ✅ Star/Unstar file (đánh dấu yêu thích)
- ✅ Soft delete (move to trash)
- ✅ Restore từ trash
- ✅ Permanent delete (xóa vĩnh viễn)

### 📂 Quản lý Folder
- ✅ Tạo folder với cấu trúc phân cấp (parent/child)
- ✅ Move file giữa các folder
- ✅ Hiển thị file trong folder cụ thể

### 👥 Chia sẻ
- ✅ Share drive với người khác (với quyền edit/delete)
- ✅ Xem danh sách drive được share
- ✅ Unshare (thu hồi quyền truy cập)

### 📊 Views
- ✅ **My Drive**: Xem tất cả file của bạn
- ✅ **Starred**: File đã đánh dấu sao
- ✅ **Recent**: 20 file gần đây nhất
- ✅ **Shared with me**: Drive được share với bạn
- ✅ **Trash**: File đã xóa (30 ngày tự động xóa)

### 💰 Token Balance
- ✅ Hiển thị số dư APT
- ✅ Hiển thị số dư SHELBY token
- ✅ Auto refresh mỗi 30s

### 📈 Storage Tracking
- ✅ Theo dõi dung lượng đã dùng
- ✅ Storage limit: 30GB mặc định
- ✅ Progress bar với màu cảnh báo

## 🏗️ Kiến trúc Smart Contract

### FileRecord Structure
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

### Folder Structure
```move
struct Folder {
    id: u64,                    // Unique folder ID
    name: vector<u8>,           // Folder name
    parent_id: u64,             // Parent folder (0 = root)
    is_deleted: bool,           // Soft delete flag
    created_at: u64,            // Creation timestamp
    modified_at: u64,           // Last modified timestamp
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
    next_folder_id: u64,                 // Auto-increment ID
    total_size: u64,                     // Total storage used
    storage_limit: u64,                  // Storage limit (30GB)
}
```

## 📝 Smart Contract Functions

### Entry Functions (Requires wallet signature)

1. **initialize_drive**: Khởi tạo drive cho user mới
2. **add_file**: Thêm file metadata sau khi upload
3. **create_folder**: Tạo folder mới
4. **toggle_star**: Đánh dấu/bỏ đánh dấu sao
5. **move_to_trash**: Di chuyển file vào thùng rác
6. **restore_from_trash**: Khôi phục file từ thùng rác
7. **delete_permanently**: Xóa file vĩnh viễn
8. **rename_file**: Đổi tên file
9. **move_file**: Di chuyển file sang folder khác
10. **share_drive**: Chia sẻ drive với người khác
11. **unshare_drive**: Thu hồi quyền chia sẻ

### View Functions (Read-only, no gas)

1. **get_drive**: Lấy toàn bộ drive data
2. **get_files_in_folder**: Lấy file trong folder cụ thể
3. **get_starred_files**: Lấy danh sách file đã star
4. **get_trash_files**: Lấy danh sách file trong trash
5. **get_recent_files**: Lấy 20 file gần đây nhất

## 🔧 Backend API Endpoints

### View Endpoints (GET)
- `GET /api/drive/:address` - Lấy drive data
- `GET /api/drive/:address/folder?folderId=X` - Files trong folder
- `GET /api/drive/:address/starred` - Starred files
- `GET /api/drive/:address/trash` - Trash files
- `GET /api/drive/:address/recent` - Recent files

### Transaction Builders (POST)
- `POST /api/drive/add-file` - Build transaction thêm file
- `POST /api/drive/rename` - Build transaction đổi tên
- `POST /api/drive/toggle-star` - Build transaction star/unstar
- `POST /api/drive/move-to-trash` - Build transaction move to trash
- `POST /api/drive/restore` - Build transaction restore
- `POST /api/drive/delete-permanently` - Build transaction delete
- `POST /api/drive/move-file` - Build transaction move file
- `POST /api/drive/create-folder` - Build transaction tạo folder
- `POST /api/drive/share` - Build transaction share
- `POST /api/drive/unshare` - Build transaction unshare

### File Operations
- `POST /api/file/upload` - Upload file to backend storage
- `GET /api/file/download?blobId=X` - Download file

## 🚦 Hướng dẫn Deploy

### 1. Deploy Smart Contract

```bash
cd /root/dapps/shelbydrive/backend/move

# Compile
aptos move compile

# Deploy
aptos move publish --profile default
```

Lưu lại MODULE_ADDR sau khi deploy thành công.

### 2. Cấu hình Backend

Update `.env`:
```bash
MODULE_ADDR=<địa_chỉ_module_vừa_deploy>
APTOS_REST=https://api.testnet.aptoslabs.com/v1
PORT=3000
```

Cập nhật imports trong `app.ts`:
```typescript
import driveRoute from "./routes/drive.route.v2";
```

Chạy backend:
```bash
cd /root/dapps/shelbydrive/backend
npm run dev
```

### 3. Cấu hình Frontend

Update imports trong components:
- `components/sidebar.v2.tsx` → rename to `sidebar.tsx`
- `lib/api.v2.ts` → rename to `api.ts`
- Update `page.tsx` để sử dụng API mới

Chạy frontend:
```bash
cd /root/dapps/shelbydrive/frontend
npm run dev
```

## 📱 Cách sử dụng

### Lần đầu sử dụng
1. Kết nối ví Aptos (Petra, Martian, etc.)
2. Click "Upload" để initialize drive (transaction đầu tiên)
3. Upload file bằng nút Upload trong sidebar

### Upload file
1. Click nút "Upload" trong sidebar
2. Chọn file từ máy tính
3. Ký transaction để lưu metadata lên blockchain
4. File được lưu off-chain, metadata on-chain

### Star file
1. Hover vào file → click icon Star
2. File xuất hiện trong view "Starred"

### Delete file
1. Click Delete file → chuyển vào "Trash"
2. Trong Trash: Restore hoặc Delete Permanently
3. Auto-delete sau 30 ngày (cần implement cleanup job)

### Share drive
1. Click Share trong file context menu
2. Nhập địa chỉ ví người nhận
3. Chọn quyền: View only / Can edit / Can delete
4. Ký transaction

## 🔐 Security Features

- ✅ Owner-only modifications (smart contract enforces)
- ✅ Soft delete với restore capability
- ✅ Share permissions with granular control
- ✅ Client-side validation
- ✅ Server-side file size limits
- ⚠️ Encryption: Cần implement client-side encryption

## 📊 Limitations & Future Improvements

### Current Limitations
- Storage limit: 30GB on-chain metadata (off-chain unlimited)
- Recent files: Không sort theo thời gian (Move limitation)
- Trash auto-delete: Cần background job
- Search: Chưa có full-text search

### Future Improvements
- [ ] Client-side encryption cho sensitive files
- [ ] Folder delete (cascade delete files)
- [ ] File versioning
- [ ] Batch operations
- [ ] Advanced search & filters
- [ ] File preview
- [ ] Sharing with groups/teams
- [ ] Activity logs
- [ ] Trash auto-cleanup cron job

## 🐛 Known Issues

1. **Recent files không sort**: Move không có built-in sorting. Cần sort ở frontend hoặc dùng indexer.
2. **Fake blob IDs**: Test data cũ cần xóa bằng `delete_permanently`.
3. **Hex encoding**: Backend tự động decode nhưng có thể gặp edge cases.

## 💡 Tips

- Luôn backup private key ví testnet
- Test trên testnet trước khi deploy mainnet
- Monitor gas fees cho mỗi operation
- Sử dụng view functions thay vì transactions khi chỉ đọc data
- Implement error handling cho tất cả wallet interactions

## 📞 Support

- Blockchain: Aptos testnet (default)
- Smart Contract Language: Move
- Frontend: Next.js 16 + React 19
- Wallet: Aptos Wallet Adapter Standard
