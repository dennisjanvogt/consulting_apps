// Storage App JavaScript

class StorageApp {
    constructor() {
        this.currentFolder = null;
        this.selectedFiles = new Set();
        this.viewMode = 'grid';
        this.contextTarget = null;
        this.uploadQueue = [];
        this.selectedManageFolder = null;
        this.draggedFolder = null;

        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFolders();
        this.loadFiles();
        this.loadStats();
    }
    
    setupEventListeners() {
        // Upload button and drop zone
        const uploadBtn = document.getElementById('uploadBtn');
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        uploadBtn.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
            e.target.value = '';
        });
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('active');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('active');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('active');
            this.handleFileSelect(e.dataTransfer.files);
        });
        
        // Prevent default drag behavior on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
        
        // New folder button
        document.getElementById('newFolderBtn').addEventListener('click', () => {
            this.showFolderModal();
        });
        
        // Search button
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.showSearchModal();
        });
        
        // View toggle
        document.getElementById('viewToggle').addEventListener('click', () => {
            this.toggleView();
        });

        // Folder management button
        document.getElementById('folderManageBtn').addEventListener('click', () => {
            this.showFolderManagement();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal || e.target.dataset.modalClose;
                if (modalId) {
                    document.getElementById(`${modalId}Modal`).classList.remove('active');
                } else {
                    e.target.closest('.modal').classList.remove('active');
                }
            });
        });
        
        // Create folder button
        document.getElementById('createFolderBtn').addEventListener('click', () => {
            this.createFolder();
        });
        
        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.search(e.target.value);
        });
        
        // Context menu
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.file-item')) {
                e.preventDefault();
                this.showContextMenu(e, e.target.closest('.file-item'));
            }
        });
        
        document.addEventListener('click', () => {
            document.getElementById('contextMenu').classList.remove('active');
        });
        
        // Context menu actions
        document.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleContextAction(action);
            });
        });
        
        // Upload progress minimize
        document.getElementById('minimizeUpload').addEventListener('click', () => {
            document.getElementById('uploadProgress').classList.remove('active');
        });
    }
    
    async loadFolders() {
        try {
            const response = await fetch('/storage/api/folders/', {
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });
            
            const data = await response.json();
            this.renderFolderTree(data.folders);
        } catch (error) {
            console.error('Error loading folders:', error);
        }
    }
    
    async loadFiles(folderId = null) {
        try {
            const url = folderId 
                ? `/storage/api/files/?folder_id=${folderId}`
                : '/storage/api/files/';
            
            const response = await fetch(url, {
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });
            
            const data = await response.json();
            this.renderFiles(data.files);
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }
    
    async loadStats() {
        try {
            const response = await fetch('/storage/api/stats/', {
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });
            
            const data = await response.json();
            
            document.getElementById('totalSize').textContent = data.formatted_total_size;
            document.getElementById('totalFiles').textContent = data.total_files;
            document.getElementById('totalFolders').textContent = data.total_folders;
            
            // Update root folder file count
            const rootCount = document.getElementById('rootFileCount');
            if (rootCount) {
                rootCount.textContent = data.total_files;
            }
            
            // Use real disk statistics
            const diskUsedPercentage = (data.disk_used / data.disk_total) * 100;
            
            // Update storage bar based on actual disk usage
            document.getElementById('storageUsed').style.width = `${diskUsedPercentage}%`;
            
            // Update storage text with real values
            document.getElementById('storageUsedText').textContent = `${data.formatted_disk_used} von`;
            document.getElementById('storageTotalText').textContent = `${data.formatted_disk_total} (${diskUsedPercentage.toFixed(1)}% belegt)`;
            
            // Also show free space
            const freeInfo = document.createElement('div');
            freeInfo.style.fontSize = '0.75rem';
            freeInfo.style.color = 'var(--text-secondary)';
            freeInfo.style.marginTop = '0.25rem';
            freeInfo.textContent = `${data.formatted_disk_free} frei`;
            
            const storageBarInfo = document.querySelector('.storage-bar-info');
            const existingFreeInfo = storageBarInfo.querySelector('div');
            if (existingFreeInfo) {
                existingFreeInfo.remove();
            }
            storageBarInfo.appendChild(freeInfo);
            
            // Change color based on actual disk usage
            const storageBar = document.getElementById('storageUsed');
            if (diskUsedPercentage > 90) {
                storageBar.style.background = 'linear-gradient(90deg, #FF4444, #CC0000)';
            } else if (diskUsedPercentage > 75) {
                storageBar.style.background = 'linear-gradient(90deg, #FFA500, #FF6B00)';
            } else {
                storageBar.style.background = 'linear-gradient(90deg, var(--accent-color), #2A5A4F)';
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    renderFolderTree(folders) {
        const tree = document.getElementById('folderTree');
        const rootItem = tree.querySelector('.root');
        
        // Keep root item and clear the rest
        tree.innerHTML = '';
        tree.appendChild(rootItem);
        
        // Add folder items
        folders.forEach(folder => {
            if (!folder.parent_id) {
                const folderEl = this.createFolderTreeItem(folder);
                tree.appendChild(folderEl);
                
                // Add children recursively
                this.addChildFolders(folderEl, folder.id, folders);
            }
        });
        
        // Add click handlers and drag & drop
        tree.querySelectorAll('.tree-item').forEach(item => {
            item.addEventListener('click', () => {
                tree.querySelectorAll('.tree-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                const folderId = item.dataset.folderId;
                this.currentFolder = folderId || null;
                this.loadFiles(this.currentFolder);
                this.updateBreadcrumb(item.textContent);
            });
            
            // Add drag over events for folders
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.classList.add('drag-over');
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                
                const fileId = e.dataTransfer.getData('fileId');
                const targetFolderId = item.dataset.folderId || null;
                
                if (fileId) {
                    await this.moveFileToFolder(fileId, targetFolderId);
                }
            });
        });
    }
    
    createFolderTreeItem(folder) {
        const div = document.createElement('div');
        div.className = 'tree-item';
        div.dataset.folderId = folder.id;
        const fileCount = folder.file_count || 0;
        div.innerHTML = `
            <div class="tree-item-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="tree-item-name">${folder.name}</span>
                ${fileCount > 0 ? `<span class="tree-item-count">${fileCount}</span>` : ''}
            </div>
        `;
        return div;
    }
    
    addChildFolders(parentEl, parentId, allFolders) {
        const children = allFolders.filter(f => f.parent_id === parentId);
        children.forEach(child => {
            const childEl = this.createFolderTreeItem(child);
            childEl.style.paddingLeft = '2rem';
            parentEl.after(childEl);
            this.addChildFolders(childEl, child.id, allFolders);
        });
    }
    
    renderFiles(files) {
        const container = document.getElementById('filesContainer');
        container.innerHTML = '';
        
        // Also render folders from the tree as items
        if (this.currentFolder) {
            // Add parent folder link if not at root
            const parentItem = this.createParentFolderItem();
            container.appendChild(parentItem);
        }
        
        // Add files
        files.forEach(file => {
            const fileEl = this.createFileItem(file);
            container.appendChild(fileEl);
        });
        
        // Add click handlers
        container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.ctrlKey && !e.metaKey) {
                    container.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
                }
                item.classList.toggle('selected');
                
                if (item.dataset.fileId) {
                    const fileId = parseInt(item.dataset.fileId);
                    if (item.classList.contains('selected')) {
                        this.selectedFiles.add(fileId);
                    } else {
                        this.selectedFiles.delete(fileId);
                    }
                }
            });
            
            item.addEventListener('dblclick', () => {
                if (item.dataset.fileId) {
                    this.previewFile(item.dataset.fileId);
                }
            });
        });
    }
    
    createParentFolderItem() {
        const div = document.createElement('div');
        div.className = 'file-item folder-item';
        div.innerHTML = `
            <div class="file-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M19 12H5m0 0l7-7m-7 7l7 7"></path>
                </svg>
            </div>
            <div class="file-name">..</div>
        `;
        
        div.addEventListener('dblclick', () => {
            // Go to parent folder
            // Implementation would depend on tracking folder hierarchy
        });
        
        return div;
    }
    
    createFileItem(file) {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.dataset.fileId = file.id;
        div.dataset.fileName = file.name;
        div.dataset.fileUrl = file.url;
        div.draggable = true;
        
        let icon = this.getFileIcon(file.file_type);
        let thumbnail = '';
        
        if (file.thumbnail_url) {
            thumbnail = `<img src="${file.thumbnail_url}" class="file-thumbnail" alt="${file.name}">`;
        } else {
            thumbnail = `<div class="file-icon">${icon}</div>`;
        }
        
        if (this.viewMode === 'grid') {
            div.innerHTML = `
                ${thumbnail}
                <div class="file-name">${file.name}</div>
                <div class="file-info">${file.formatted_size}</div>
            `;
        } else {
            div.innerHTML = `
                ${thumbnail}
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-info">${file.formatted_size}</div>
                </div>
            `;
        }
        
        // Add drag events
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('fileId', file.id);
            div.classList.add('dragging');
        });
        
        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
        });
        
        return div;
    }
    
    getFileIcon(fileType) {
        const icons = {
            image: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>`,
            video: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>`,
            document: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>`,
            code: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
            </svg>`,
            other: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
            </svg>`
        };
        
        return icons[fileType] || icons.other;
    }
    
    async handleFileSelect(files) {
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadList = document.getElementById('uploadList');
        
        uploadProgress.classList.add('active');
        uploadList.innerHTML = '';
        
        for (const file of files) {
            const uploadItem = this.createUploadItem(file);
            uploadList.appendChild(uploadItem);
            
            await this.uploadFile(file, uploadItem);
        }
        
        // Reload files and stats after upload
        this.loadFiles(this.currentFolder);
        this.loadStats();
        this.loadFolders();
    }
    
    createUploadItem(file) {
        const div = document.createElement('div');
        div.className = 'upload-item';
        div.innerHTML = `
            <div class="upload-info">
                <span class="upload-name">${file.name}</span>
                <span class="upload-status">Uploading...</span>
            </div>
            <div class="upload-bar">
                <div class="upload-progress-bar" style="width: 0%"></div>
            </div>
        `;
        return div;
    }
    
    async uploadFile(file, uploadItem) {
        const formData = new FormData();
        formData.append('file', file);
        if (this.currentFolder) {
            formData.append('folder_id', this.currentFolder);
        }
        
        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    uploadItem.querySelector('.upload-progress-bar').style.width = `${percentComplete}%`;
                }
            });
            
            return new Promise((resolve, reject) => {
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        uploadItem.querySelector('.upload-status').textContent = 'Complete';
                        uploadItem.querySelector('.upload-progress-bar').style.width = '100%';
                        resolve();
                    } else {
                        uploadItem.querySelector('.upload-status').textContent = 'Failed';
                        reject();
                    }
                });
                
                xhr.addEventListener('error', () => {
                    uploadItem.querySelector('.upload-status').textContent = 'Failed';
                    reject();
                });
                
                xhr.open('POST', '/storage/api/files/');
                xhr.setRequestHeader('X-CSRFToken', csrftoken);
                xhr.send(formData);
            });
        } catch (error) {
            console.error('Upload error:', error);
        }
    }
    
    toggleView() {
        const container = document.getElementById('filesContainer');
        const gridIcon = document.getElementById('gridIcon');
        const listIcon = document.getElementById('listIcon');
        
        if (this.viewMode === 'grid') {
            this.viewMode = 'list';
            container.classList.remove('grid-view');
            container.classList.add('list-view');
            gridIcon.style.display = 'none';
            listIcon.style.display = 'block';
        } else {
            this.viewMode = 'grid';
            container.classList.remove('list-view');
            container.classList.add('grid-view');
            gridIcon.style.display = 'block';
            listIcon.style.display = 'none';
        }
        
        // Re-render files with new view
        this.loadFiles(this.currentFolder);
    }
    
    showFolderModal() {
        document.getElementById('folderModal').classList.add('active');
        document.getElementById('folderName').focus();
    }
    
    async createFolder() {
        const name = document.getElementById('folderName').value.trim();
        if (!name) return;
        
        try {
            const response = await fetch('/storage/api/folders/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({
                    name: name,
                    parent_id: this.currentFolder
                })
            });
            
            if (response.ok) {
                document.getElementById('folderModal').classList.remove('active');
                document.getElementById('folderName').value = '';
                this.loadFolders();
                this.loadFiles(this.currentFolder);
                this.loadStats();
            }
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    }
    
    showSearchModal() {
        document.getElementById('searchModal').classList.add('active');
        document.getElementById('searchInput').focus();
    }
    
    async search(query) {
        if (!query) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }
        
        try {
            const response = await fetch(`/storage/api/search/?q=${encodeURIComponent(query)}`, {
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });
            
            const data = await response.json();
            this.renderSearchResults(data);
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    renderSearchResults(data) {
        const container = document.getElementById('searchResults');
        container.innerHTML = '';
        
        [...data.folders, ...data.files].forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <div>${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                    ${item.path || item.formatted_size || ''}
                </div>
            `;
            
            div.addEventListener('click', () => {
                if (item.formatted_size) {
                    // It's a file
                    this.previewFile(item.id);
                } else {
                    // It's a folder
                    this.currentFolder = item.id;
                    this.loadFiles(item.id);
                    document.getElementById('searchModal').classList.remove('active');
                }
            });
            
            container.appendChild(div);
        });
    }
    
    showContextMenu(e, target) {
        const menu = document.getElementById('contextMenu');
        this.contextTarget = target;
        
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.classList.add('active');
    }
    
    async handleContextAction(action) {
        if (!this.contextTarget) return;
        
        const fileId = this.contextTarget.dataset.fileId;
        const fileName = this.contextTarget.dataset.fileName;
        const fileUrl = this.contextTarget.dataset.fileUrl;
        
        switch (action) {
            case 'open':
                this.previewFile(fileId);
                break;
            case 'download':
                window.open(`/storage/api/files/${fileId}/download/`, '_blank');
                break;
            case 'rename':
                const newName = prompt('New name:', fileName);
                if (newName && newName !== fileName) {
                    await this.renameFile(fileId, newName);
                }
                break;
            case 'delete':
                if (confirm(`Delete "${fileName}"?`)) {
                    await this.deleteFile(fileId);
                }
                break;
        }
        
        document.getElementById('contextMenu').classList.remove('active');
    }
    
    async previewFile(fileId) {
        try {
            const response = await fetch(`/storage/api/files/${fileId}/`, {
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });
            
            const file = await response.json();
            
            const modal = document.getElementById('previewModal');
            const title = document.getElementById('previewTitle');
            const container = document.getElementById('previewContainer');
            const downloadBtn = document.getElementById('downloadBtn');
            
            title.textContent = file.name;
            
            downloadBtn.onclick = () => {
                window.open(`/storage/api/files/${fileId}/download/`, '_blank');
            };
            
            // Render preview based on file type
            if (file.file_type === 'image') {
                container.innerHTML = `<img src="${file.url}" alt="${file.name}">`;
            } else if (file.file_type === 'video') {
                container.innerHTML = `
                    <video controls>
                        <source src="${file.url}" type="${file.mime_type}">
                        Your browser does not support the video tag.
                    </video>
                `;
            } else if (file.file_type === 'code' || file.file_type === 'document') {
                // For text files, we'd need to fetch content
                container.innerHTML = `
                    <div class="text-preview">
                        <p>Preview not available for this file type.</p>
                        <p>Click download to view the file.</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        ${this.getFileIcon(file.file_type)}
                        <p style="margin-top: 1rem;">${file.name}</p>
                        <p style="color: var(--text-secondary);">${file.formatted_size}</p>
                    </div>
                `;
            }
            
            modal.classList.add('active');
        } catch (error) {
            console.error('Preview error:', error);
        }
    }
    
    async renameFile(fileId, newName) {
        try {
            const response = await fetch(`/storage/api/files/${fileId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ name: newName })
            });
            
            if (response.ok) {
                this.loadFiles(this.currentFolder);
            }
        } catch (error) {
            console.error('Rename error:', error);
        }
    }
    
    async deleteFile(fileId) {
        try {
            const response = await fetch(`/storage/api/files/${fileId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });
            
            if (response.ok) {
                this.loadFiles(this.currentFolder);
                this.loadStats();
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    }
    
    updateBreadcrumb(folderName) {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = `<span class="breadcrumb-item active">${folderName}</span>`;
    }
    
    async moveFileToFolder(fileId, targetFolderId) {
        try {
            const response = await fetch(`/storage/api/files/${fileId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ folder_id: targetFolderId })
            });

            if (response.ok) {
                // Reload files in current view
                this.loadFiles(this.currentFolder);
                // Reload folders to update counts
                this.loadFolders();
                this.loadStats();
            }
        } catch (error) {
            console.error('Error moving file:', error);
        }
    }

    // Folder Management Methods
    async showFolderManagement() {
        const modal = document.getElementById('folderManageModal');
        modal.classList.add('active');

        // Load folders for management
        await this.loadFoldersForManagement();

        // Setup event listeners for management modal
        this.setupManagementEventListeners();
    }

    async loadFoldersForManagement() {
        try {
            const response = await fetch('/storage/api/folders/', {
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });

            const data = await response.json();
            this.renderFolderTreeManagement(data.folders);

            // Update folder count
            document.getElementById('folderCount').textContent = `${data.folders.length} Ordner`;
        } catch (error) {
            console.error('Error loading folders for management:', error);
        }
    }

    renderFolderTreeManagement(folders) {
        const tree = document.getElementById('folderTreeManage');
        tree.innerHTML = '';

        // Create root node
        const rootNode = this.createManagementTreeNode({
            id: null,
            name: 'Alle Dateien',
            file_count: 0,
            isRoot: true
        });
        tree.appendChild(rootNode);

        // Build tree structure
        const folderMap = new Map();
        folders.forEach(folder => {
            folderMap.set(folder.id, folder);
            folder.children = [];
        });

        // Organize folders by parent
        const rootFolders = [];
        folders.forEach(folder => {
            if (folder.parent_id) {
                const parent = folderMap.get(folder.parent_id);
                if (parent) {
                    parent.children.push(folder);
                }
            } else {
                rootFolders.push(folder);
            }
        });

        // Render tree recursively
        rootFolders.forEach(folder => {
            const node = this.createManagementTreeNode(folder);
            tree.appendChild(node);
            this.renderChildrenNodes(node, folder.children);
        });
    }

    createManagementTreeNode(folder) {
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.dataset.folderId = folder.id || '';

        const content = document.createElement('div');
        content.className = 'tree-node-content';
        content.draggable = !folder.isRoot;

        // Toggle for expandable folders
        const hasChildren = folder.children && folder.children.length > 0;
        const toggle = document.createElement('span');
        toggle.className = 'tree-node-toggle';
        if (hasChildren) {
            toggle.innerHTML = '▶';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFolderExpand(node);
            });
        }
        content.appendChild(toggle);

        // Folder icon
        const icon = document.createElement('svg');
        icon.className = 'tree-node-icon';
        icon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
        content.appendChild(icon);

        // Folder name
        const name = document.createElement('span');
        name.className = 'tree-node-name';
        name.textContent = folder.name;
        content.appendChild(name);

        // File count
        if (folder.file_count > 0) {
            const count = document.createElement('span');
            count.className = 'tree-node-count';
            count.textContent = folder.file_count;
            content.appendChild(count);
        }

        // Click handler
        content.addEventListener('click', () => {
            this.selectManagementFolder(folder, content);
        });

        // Drag and drop handlers
        if (!folder.isRoot) {
            content.addEventListener('dragstart', (e) => {
                this.draggedFolder = folder;
                node.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('folderId', folder.id);
            });

            content.addEventListener('dragend', () => {
                node.classList.remove('dragging');
                this.draggedFolder = null;
            });
        }

        content.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.draggedFolder && this.draggedFolder.id !== folder.id) {
                content.classList.add('drag-over');
            }
        });

        content.addEventListener('dragleave', () => {
            content.classList.remove('drag-over');
        });

        content.addEventListener('drop', async (e) => {
            e.preventDefault();
            content.classList.remove('drag-over');

            if (this.draggedFolder && this.draggedFolder.id !== folder.id) {
                await this.moveFolderTo(this.draggedFolder.id, folder.id || null);
            }
        });

        node.appendChild(content);

        // Children container
        if (hasChildren) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-node-children';
            node.appendChild(childrenContainer);
        }

        return node;
    }

    renderChildrenNodes(parentNode, children) {
        if (!children || children.length === 0) return;

        const childrenContainer = parentNode.querySelector('.tree-node-children');
        if (!childrenContainer) return;

        children.forEach(child => {
            const node = this.createManagementTreeNode(child);
            childrenContainer.appendChild(node);
            if (child.children && child.children.length > 0) {
                this.renderChildrenNodes(node, child.children);
            }
        });
    }

    toggleFolderExpand(node) {
        const toggle = node.querySelector('.tree-node-toggle');
        const children = node.querySelector('.tree-node-children');

        if (toggle && children) {
            toggle.classList.toggle('expanded');
            children.classList.toggle('expanded');
        }
    }

    selectManagementFolder(folder, contentElement) {
        // Update UI selection
        document.querySelectorAll('.tree-node-content').forEach(el => {
            el.classList.remove('selected');
        });
        contentElement.classList.add('selected');

        this.selectedManageFolder = folder;

        // Update selected folder info
        document.getElementById('selectedFolderInfo').textContent = folder.name;

        // Show folder details
        this.showFolderDetails(folder);
    }

    async showFolderDetails(folder) {
        const emptyView = document.querySelector('.folder-details-empty');
        const detailsView = document.querySelector('.folder-details-content');

        if (folder.isRoot) {
            emptyView.style.display = 'flex';
            detailsView.style.display = 'none';
            return;
        }

        emptyView.style.display = 'none';
        detailsView.style.display = 'block';

        // Update details
        document.getElementById('detailName').textContent = folder.name;
        document.getElementById('detailPath').textContent = folder.path || `/${folder.name}`;
        document.getElementById('detailFiles').textContent = folder.file_count || '0';

        // Format size
        const size = folder.size || 0;
        let formattedSize = '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;
        let displaySize = size;

        while (displaySize >= 1024 && unitIndex < units.length - 1) {
            displaySize /= 1024;
            unitIndex++;
        }

        formattedSize = `${displaySize.toFixed(1)} ${units[unitIndex]}`;
        document.getElementById('detailSize').textContent = formattedSize;

        // Format date
        const created = new Date(folder.created_at);
        document.getElementById('detailCreated').textContent = created.toLocaleString('de-DE');
    }

    setupManagementEventListeners() {
        // Add folder button
        const addBtn = document.getElementById('addFolderBtn');
        if (addBtn && !addBtn.hasListener) {
            addBtn.hasListener = true;
            addBtn.addEventListener('click', () => {
                this.showAddFolderDialog();
            });
        }

        // Rename folder button
        const renameBtn = document.getElementById('renameFolderBtn');
        if (renameBtn && !renameBtn.hasListener) {
            renameBtn.hasListener = true;
            renameBtn.addEventListener('click', () => {
                this.renameFolderDialog();
            });
        }

        // Move folder button
        const moveBtn = document.getElementById('moveFolderBtn');
        if (moveBtn && !moveBtn.hasListener) {
            moveBtn.hasListener = true;
            moveBtn.addEventListener('click', () => {
                this.moveFolderDialog();
            });
        }

        // Delete folder button
        const deleteBtn = document.getElementById('deleteFolderBtn');
        if (deleteBtn && !deleteBtn.hasListener) {
            deleteBtn.hasListener = true;
            deleteBtn.addEventListener('click', () => {
                this.deleteFolderDialog();
            });
        }
    }

    showAddFolderDialog() {
        const name = prompt('Neuer Ordnername:', '');
        if (!name) return;

        const parentId = this.selectedManageFolder && !this.selectedManageFolder.isRoot
            ? this.selectedManageFolder.id
            : null;

        this.createNewFolder(name, parentId);
    }

    async createNewFolder(name, parentId) {
        try {
            const response = await fetch('/storage/api/folders/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({
                    name: name,
                    parent_id: parentId
                })
            });

            if (response.ok) {
                await this.loadFoldersForManagement();
                this.loadFolders();
                this.loadStats();
            } else {
                const error = await response.json();
                alert(error.error || 'Fehler beim Erstellen des Ordners');
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Fehler beim Erstellen des Ordners');
        }
    }

    renameFolderDialog() {
        if (!this.selectedManageFolder || this.selectedManageFolder.isRoot) {
            alert('Bitte wählen Sie einen Ordner zum Umbenennen aus');
            return;
        }

        const newName = prompt('Neuer Name:', this.selectedManageFolder.name);
        if (!newName || newName === this.selectedManageFolder.name) return;

        this.renameFolder(this.selectedManageFolder.id, newName);
    }

    async renameFolder(folderId, newName) {
        try {
            const response = await fetch(`/storage/api/folders/${folderId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ name: newName })
            });

            if (response.ok) {
                await this.loadFoldersForManagement();
                this.loadFolders();

                // Update selected folder details
                const updatedFolder = await response.json();
                updatedFolder.file_count = this.selectedManageFolder.file_count;
                updatedFolder.size = this.selectedManageFolder.size;
                updatedFolder.created_at = this.selectedManageFolder.created_at;
                this.selectedManageFolder = updatedFolder;
                this.showFolderDetails(updatedFolder);
            }
        } catch (error) {
            console.error('Error renaming folder:', error);
            alert('Fehler beim Umbenennen des Ordners');
        }
    }

    moveFolderDialog() {
        if (!this.selectedManageFolder || this.selectedManageFolder.isRoot) {
            alert('Bitte wählen Sie einen Ordner zum Verschieben aus');
            return;
        }

        alert('Verwenden Sie Drag & Drop, um Ordner zu verschieben');
    }

    async moveFolderTo(folderId, targetParentId) {
        try {
            const response = await fetch(`/storage/api/folders/${folderId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ parent_id: targetParentId })
            });

            if (response.ok) {
                await this.loadFoldersForManagement();
                this.loadFolders();
            } else {
                const error = await response.json();
                alert(error.error || 'Fehler beim Verschieben des Ordners');
            }
        } catch (error) {
            console.error('Error moving folder:', error);
            alert('Fehler beim Verschieben des Ordners');
        }
    }

    deleteFolderDialog() {
        if (!this.selectedManageFolder || this.selectedManageFolder.isRoot) {
            alert('Bitte wählen Sie einen Ordner zum Löschen aus');
            return;
        }

        const confirm = window.confirm(
            `Möchten Sie den Ordner "${this.selectedManageFolder.name}" und alle enthaltenen Dateien wirklich löschen?`
        );

        if (confirm) {
            this.deleteFolder(this.selectedManageFolder.id);
        }
    }

    async deleteFolder(folderId) {
        try {
            const response = await fetch(`/storage/api/folders/${folderId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });

            if (response.ok) {
                // Clear selection
                this.selectedManageFolder = null;
                document.getElementById('selectedFolderInfo').textContent = 'Kein Ordner ausgewählt';

                // Show empty view
                document.querySelector('.folder-details-empty').style.display = 'flex';
                document.querySelector('.folder-details-content').style.display = 'none';

                // Reload folders
                await this.loadFoldersForManagement();
                this.loadFolders();
                this.loadFiles(this.currentFolder);
                this.loadStats();
            }
        } catch (error) {
            console.error('Error deleting folder:', error);
            alert('Fehler beim Löschen des Ordners');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new StorageApp();
});