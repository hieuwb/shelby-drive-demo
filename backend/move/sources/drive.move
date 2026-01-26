module shelby_drive::drive {
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::signer;

    // ==================== Errors ====================
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_OWNER: u64 = 3;
    const E_FILE_NOT_FOUND: u64 = 4;
    const E_STORAGE_LIMIT_EXCEEDED: u64 = 5;

    // ==================== Constants ====================
    const DEFAULT_STORAGE_LIMIT: u64 = 644245094400; // 600 GB

    // ==================== Structs ====================

    /// File metadata (actual data stored on Shelby network)
    struct FileRecord has store, drop, copy {
        id: u64,
        shelby_blob_name: vector<u8>,  // full blob name on Shelby network
        name: vector<u8>,              // display name
        size: u64,                     // bytes
        mime_type: vector<u8>,
        is_starred: bool,
        is_deleted: bool,              // in trash
        folder_id: u64,                // 0 = root
        created_at: u64,
        modified_at: u64,
    }

    /// Folder structure
    struct Folder has store, drop, copy {
        id: u64,
        name: vector<u8>,
        parent_id: u64,                // 0 = root
        is_deleted: bool,
        created_at: u64,
    }

    /// Share permission
    struct SharePermission has store, drop, copy {
        shared_with: address,
        can_edit: bool,
        shared_at: u64,
    }

    /// User's drive
    struct Drive has key {
        owner: address,
        files: vector<FileRecord>,
        folders: vector<Folder>,
        shared_with: vector<SharePermission>,
        next_file_id: u64,
        next_folder_id: u64,
        storage_used: u64,
        storage_limit: u64,
    }

    // ==================== Public Functions ====================

    /// Initialize drive
    public entry fun initialize_drive(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<Drive>(addr), E_ALREADY_INITIALIZED);

        move_to(account, Drive {
            owner: addr,
            files: vector::empty(),
            folders: vector::empty(),
            shared_with: vector::empty(),
            next_file_id: 1,
            next_folder_id: 1,
            storage_used: 0,
            storage_limit: DEFAULT_STORAGE_LIMIT,
        });
    }

    /// Add file record (after uploading to Shelby)
    public entry fun add_file(
        account: &signer,
        shelby_blob_name: vector<u8>,
        name: vector<u8>,
        size: u64,
        mime_type: vector<u8>,
        folder_id: u64,
    ) acquires Drive {
        let addr = signer::address_of(account);
        assert!(exists<Drive>(addr), E_NOT_INITIALIZED);

        let drive = borrow_global_mut<Drive>(addr);
        assert!(drive.owner == addr, E_NOT_OWNER);
        assert!(drive.storage_used + size <= drive.storage_limit, E_STORAGE_LIMIT_EXCEEDED);

        let now = timestamp::now_seconds();
        let file = FileRecord {
            id: drive.next_file_id,
            shelby_blob_name,
            name,
            size,
            mime_type,
            is_starred: false,
            is_deleted: false,
            folder_id,
            created_at: now,
            modified_at: now,
        };

        vector::push_back(&mut drive.files, file);
        drive.next_file_id = drive.next_file_id + 1;
        drive.storage_used = drive.storage_used + size;
    }

    /// Toggle star status
    public entry fun toggle_star(
        account: &signer,
        file_id: u64,
    ) acquires Drive {
        let addr = signer::address_of(account);
        assert!(exists<Drive>(addr), E_NOT_INITIALIZED);

        let drive = borrow_global_mut<Drive>(addr);
        let len = vector::length(&drive.files);
        let i = 0;
        let found = false;

        while (i < len) {
            let file = vector::borrow_mut(&mut drive.files, i);
            if (file.id == file_id) {
                file.is_starred = !file.is_starred;
                file.modified_at = timestamp::now_seconds();
                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, E_FILE_NOT_FOUND);
    }

    /// Move to trash
    public entry fun move_to_trash(
        account: &signer,
        file_id: u64,
    ) acquires Drive {
        let addr = signer::address_of(account);
        assert!(exists<Drive>(addr), E_NOT_INITIALIZED);

        let drive = borrow_global_mut<Drive>(addr);
        let len = vector::length(&drive.files);
        let i = 0;
        let found = false;

        while (i < len) {
            let file = vector::borrow_mut(&mut drive.files, i);
            if (file.id == file_id && !file.is_deleted) {
                file.is_deleted = true;
                file.modified_at = timestamp::now_seconds();
                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, E_FILE_NOT_FOUND);
    }

    /// Restore from trash
    public entry fun restore_from_trash(
        account: &signer,
        file_id: u64,
    ) acquires Drive {
        let addr = signer::address_of(account);
        assert!(exists<Drive>(addr), E_NOT_INITIALIZED);

        let drive = borrow_global_mut<Drive>(addr);
        let len = vector::length(&drive.files);
        let i = 0;
        let found = false;

        while (i < len) {
            let file = vector::borrow_mut(&mut drive.files, i);
            if (file.id == file_id && file.is_deleted) {
                file.is_deleted = false;
                file.modified_at = timestamp::now_seconds();
                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, E_FILE_NOT_FOUND);
    }

    /// Permanently delete file
    public entry fun delete_file(
        account: &signer,
        file_id: u64,
    ) acquires Drive {
        let addr = signer::address_of(account);
        assert!(exists<Drive>(addr), E_NOT_INITIALIZED);

        let drive = borrow_global_mut<Drive>(addr);
        let len = vector::length(&drive.files);
        let i = 0;
        let found = false;

        while (i < len) {
            let file = vector::borrow(&drive.files, i);
            if (file.id == file_id) {
                drive.storage_used = drive.storage_used - file.size;
                vector::remove(&mut drive.files, i);
                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, E_FILE_NOT_FOUND);
    }

    /// Create folder
    public entry fun create_folder(
        account: &signer,
        name: vector<u8>,
        parent_id: u64,
    ) acquires Drive {
        let addr = signer::address_of(account);
        assert!(exists<Drive>(addr), E_NOT_INITIALIZED);

        let drive = borrow_global_mut<Drive>(addr);
        let folder = Folder {
            id: drive.next_folder_id,
            name,
            parent_id,
            is_deleted: false,
            created_at: timestamp::now_seconds(),
        };

        vector::push_back(&mut drive.folders, folder);
        drive.next_folder_id = drive.next_folder_id + 1;
    }

    /// Share drive with another user
    public entry fun share_drive(
        account: &signer,
        recipient: address,
        can_edit: bool,
    ) acquires Drive {
        let addr = signer::address_of(account);
        assert!(exists<Drive>(addr), E_NOT_INITIALIZED);

        let drive = borrow_global_mut<Drive>(addr);
        let permission = SharePermission {
            shared_with: recipient,
            can_edit,
            shared_at: timestamp::now_seconds(),
        };

        vector::push_back(&mut drive.shared_with, permission);
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_files(owner: address): vector<FileRecord> acquires Drive {
        assert!(exists<Drive>(owner), E_NOT_INITIALIZED);
        let drive = borrow_global<Drive>(owner);
        drive.files
    }

    #[view]
    public fun get_folders(owner: address): vector<Folder> acquires Drive {
        assert!(exists<Drive>(owner), E_NOT_INITIALIZED);
        let drive = borrow_global<Drive>(owner);
        drive.folders
    }

    #[view]
    public fun get_storage_info(owner: address): (u64, u64) acquires Drive {
        assert!(exists<Drive>(owner), E_NOT_INITIALIZED);
        let drive = borrow_global<Drive>(owner);
        (drive.storage_used, drive.storage_limit)
    }
}
