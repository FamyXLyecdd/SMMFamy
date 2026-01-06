/**
 * SMMFamy - Image Upload Component
 * Drag & drop, preview, and upload handling | ~350 lines
 */

const ImageUpload = {
    instances: new Map(),

    /**
     * Create image upload instance
     */
    create(elementId, options = {}) {
        const defaults = {
            accept: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            maxSize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            multiple: false,
            preview: true,
            previewSize: 120,
            uploadUrl: null,
            autoUpload: false,
            onChange: null,
            onUpload: null,
            onError: null,
            onRemove: null
        };

        const config = { ...defaults, ...options };
        const container = document.getElementById(elementId);

        if (!container) {
            console.error('ImageUpload container not found:', elementId);
            return null;
        }

        const instance = {
            id: elementId,
            container,
            config,
            files: [],
            previews: [],

            /**
             * Initialize the component
             */
            init() {
                this.render();
                this.attachEvents();
                return this;
            },

            /**
             * Render the upload zone
             */
            render() {
                this.container.innerHTML = `
                    <div class="upload-zone" data-upload-zone>
                        <input type="file" class="upload-input" 
                               accept="${this.config.accept.join(',')}"
                               ${this.config.multiple ? 'multiple' : ''}
                               data-upload-input>
                        <div class="upload-content">
                            <div class="upload-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                            </div>
                            <p class="upload-text">
                                <span class="upload-primary">Click to upload</span> or drag and drop
                            </p>
                            <p class="upload-hint">
                                ${this.config.accept.map(t => t.split('/')[1].toUpperCase()).join(', ')} 
                                (max ${this.formatSize(this.config.maxSize)})
                            </p>
                        </div>
                    </div>
                    <div class="upload-previews" data-upload-previews></div>
                `;
            },

            /**
             * Attach event listeners
             */
            attachEvents() {
                const zone = this.container.querySelector('[data-upload-zone]');
                const input = this.container.querySelector('[data-upload-input]');

                // Click to select
                zone.addEventListener('click', () => input.click());

                // File input change
                input.addEventListener('change', (e) => {
                    this.handleFiles(e.target.files);
                    e.target.value = ''; // Reset for re-upload
                });

                // Drag & drop
                zone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    zone.classList.add('upload-zone-active');
                });

                zone.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    zone.classList.remove('upload-zone-active');
                });

                zone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    zone.classList.remove('upload-zone-active');
                    this.handleFiles(e.dataTransfer.files);
                });

                // Prevent default drag behavior on window
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
                    document.addEventListener(event, (e) => e.preventDefault(), false);
                });
            },

            /**
             * Handle selected files
             */
            handleFiles(fileList) {
                const files = Array.from(fileList);

                for (const file of files) {
                    // Check file count
                    if (this.files.length >= this.config.maxFiles) {
                        this.error(`Maximum ${this.config.maxFiles} files allowed`);
                        break;
                    }

                    // Validate file type
                    if (!this.config.accept.includes(file.type)) {
                        this.error(`Invalid file type: ${file.name}`);
                        continue;
                    }

                    // Validate file size
                    if (file.size > this.config.maxSize) {
                        this.error(`File too large: ${file.name} (max ${this.formatSize(this.config.maxSize)})`);
                        continue;
                    }

                    // Add file
                    this.addFile(file);
                }
            },

            /**
             * Add file to list
             */
            addFile(file) {
                const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = {
                        id: fileId,
                        file,
                        dataUrl: e.target.result,
                        uploaded: false,
                        progress: 0
                    };

                    this.files.push(preview);
                    this.renderPreview(preview);

                    if (this.config.onChange) {
                        this.config.onChange(this.files);
                    }

                    if (this.config.autoUpload) {
                        this.uploadFile(preview);
                    }
                };

                reader.readAsDataURL(file);
            },

            /**
             * Render file preview
             */
            renderPreview(preview) {
                const container = this.container.querySelector('[data-upload-previews]');

                const previewEl = document.createElement('div');
                previewEl.className = 'upload-preview';
                previewEl.id = preview.id;
                previewEl.innerHTML = `
                    <img src="${preview.dataUrl}" alt="${preview.file.name}" 
                         style="width: ${this.config.previewSize}px; height: ${this.config.previewSize}px;">
                    <div class="upload-preview-overlay">
                        <button class="upload-preview-remove" data-remove="${preview.id}">×</button>
                    </div>
                    <div class="upload-preview-progress" data-progress="${preview.id}">
                        <div class="upload-preview-progress-bar"></div>
                    </div>
                    <div class="upload-preview-name">${this.truncate(preview.file.name, 15)}</div>
                `;

                container.appendChild(previewEl);

                // Remove button
                previewEl.querySelector('[data-remove]').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFile(preview.id);
                });
            },

            /**
             * Remove file
             */
            removeFile(fileId) {
                this.files = this.files.filter(f => f.id !== fileId);
                const previewEl = document.getElementById(fileId);
                if (previewEl) {
                    previewEl.classList.add('upload-preview-removing');
                    setTimeout(() => previewEl.remove(), 200);
                }

                if (this.config.onRemove) {
                    this.config.onRemove(fileId, this.files);
                }

                if (this.config.onChange) {
                    this.config.onChange(this.files);
                }
            },

            /**
             * Upload file
             */
            async uploadFile(preview) {
                if (!this.config.uploadUrl) {
                    console.warn('No upload URL configured');
                    return;
                }

                const formData = new FormData();
                formData.append('file', preview.file);

                try {
                    const xhr = new XMLHttpRequest();

                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const progress = (e.loaded / e.total) * 100;
                            this.updateProgress(preview.id, progress);
                        }
                    });

                    xhr.addEventListener('load', () => {
                        if (xhr.status === 200) {
                            preview.uploaded = true;
                            this.updateProgress(preview.id, 100);

                            if (this.config.onUpload) {
                                this.config.onUpload(preview, JSON.parse(xhr.response));
                            }
                        } else {
                            this.error(`Upload failed: ${preview.file.name}`);
                        }
                    });

                    xhr.addEventListener('error', () => {
                        this.error(`Upload error: ${preview.file.name}`);
                    });

                    xhr.open('POST', this.config.uploadUrl);
                    xhr.send(formData);
                } catch (error) {
                    this.error(`Upload failed: ${error.message}`);
                }
            },

            /**
             * Update upload progress
             */
            updateProgress(fileId, progress) {
                const progressEl = document.querySelector(`[data-progress="${fileId}"] .upload-preview-progress-bar`);
                if (progressEl) {
                    progressEl.style.width = `${progress}%`;
                }

                const preview = this.files.find(f => f.id === fileId);
                if (preview) {
                    preview.progress = progress;
                }
            },

            /**
             * Upload all files
             */
            uploadAll() {
                this.files.forEach(preview => {
                    if (!preview.uploaded) {
                        this.uploadFile(preview);
                    }
                });
            },

            /**
             * Get files
             */
            getFiles() {
                return this.files;
            },

            /**
             * Clear all files
             */
            clear() {
                this.files = [];
                const container = this.container.querySelector('[data-upload-previews]');
                container.innerHTML = '';

                if (this.config.onChange) {
                    this.config.onChange(this.files);
                }
            },

            /**
             * Show error
             */
            error(message) {
                if (this.config.onError) {
                    this.config.onError(message);
                } else if (window.Notify) {
                    Notify.error(message);
                } else {
                    console.error(message);
                }
            },

            /**
             * Format file size
             */
            formatSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            },

            /**
             * Truncate filename
             */
            truncate(str, len) {
                if (str.length <= len) return str;
                const ext = str.split('.').pop();
                return str.substring(0, len - ext.length - 3) + '...' + ext;
            }
        };

        // Initialize and store
        instance.init();
        this.instances.set(elementId, instance);

        return instance;
    },

    /**
     * Get instance by ID
     */
    getInstance(elementId) {
        return this.instances.get(elementId);
    }
};

// Upload styles
const uploadStyles = document.createElement('style');
uploadStyles.textContent = `
    .upload-zone {
        position: relative;
        border: 2px dashed var(--border-default);
        border-radius: var(--radius-lg);
        padding: var(--space-8);
        text-align: center;
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .upload-zone:hover,
    .upload-zone-active {
        border-color: var(--color-primary-500);
        background: var(--color-primary-50);
    }
    
    .upload-input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .upload-icon {
        color: var(--text-muted);
        margin-bottom: var(--space-3);
    }
    
    .upload-text {
        color: var(--text-secondary);
        margin-bottom: var(--space-2);
    }
    
    .upload-primary {
        color: var(--color-primary-600);
        font-weight: var(--font-semibold);
    }
    
    .upload-hint {
        font-size: var(--text-sm);
        color: var(--text-muted);
    }
    
    .upload-previews {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        margin-top: var(--space-4);
    }
    
    .upload-preview {
        position: relative;
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        animation: fadeIn 0.2s ease;
    }
    
    .upload-preview-removing {
        animation: fadeOut 0.2s ease forwards;
    }
    
    .upload-preview img {
        display: block;
        object-fit: cover;
    }
    
    .upload-preview-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
    }
    
    .upload-preview:hover .upload-preview-overlay {
        opacity: 1;
    }
    
    .upload-preview-remove {
        width: 28px;
        height: 28px;
        border-radius: var(--radius-full);
        background: white;
        border: none;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .upload-preview-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: rgba(0, 0, 0, 0.3);
    }
    
    .upload-preview-progress-bar {
        height: 100%;
        width: 0;
        background: var(--color-primary-500);
        transition: width 0.3s ease;
    }
    
    .upload-preview-name {
        position: absolute;
        bottom: 4px;
        left: 4px;
        right: 4px;
        font-size: 10px;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
`;

document.head.appendChild(uploadStyles);

// Export for use
window.ImageUpload = ImageUpload;
