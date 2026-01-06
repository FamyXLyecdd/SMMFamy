/**
 * SMMFamy - File Preview Component
 * Preview files before upload | ~200 lines
 */

const FilePreview = {
    /**
     * Create preview from file
     */
    async createPreview(file, options = {}) {
        const config = {
            maxWidth: 300,
            maxHeight: 300,
            imageQuality: 0.8,
            ...options
        };

        const fileType = this.getFileType(file);

        switch (fileType) {
            case 'image':
                return this.createImagePreview(file, config);
            case 'video':
                return this.createVideoPreview(file, config);
            case 'audio':
                return this.createAudioPreview(file);
            case 'pdf':
                return this.createPDFPreview(file);
            default:
                return this.createGenericPreview(file);
        }
    },

    /**
     * Get file type
     */
    getFileType(file) {
        const type = file.type.split('/')[0];
        if (type === 'image') return 'image';
        if (type === 'video') return 'video';
        if (type === 'audio') return 'audio';
        if (file.type === 'application/pdf') return 'pdf';
        return 'file';
    },

    /**
     * Create image preview
     */
    createImagePreview(file, config) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Resize if needed
                    let { width, height } = img;

                    if (width > config.maxWidth) {
                        height = (config.maxWidth / width) * height;
                        width = config.maxWidth;
                    }

                    if (height > config.maxHeight) {
                        width = (config.maxHeight / height) * width;
                        height = config.maxHeight;
                    }

                    resolve({
                        type: 'image',
                        url: e.target.result,
                        width: Math.round(width),
                        height: Math.round(height),
                        originalWidth: img.width,
                        originalHeight: img.height,
                        name: file.name,
                        size: this.formatSize(file.size)
                    });
                };
                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Create video preview
     */
    createVideoPreview(file, config) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                video.currentTime = 1; // Seek to 1 second for thumbnail
            };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = config.maxWidth;
                canvas.height = (config.maxWidth / video.videoWidth) * video.videoHeight;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                resolve({
                    type: 'video',
                    url: canvas.toDataURL('image/jpeg', config.imageQuality),
                    width: canvas.width,
                    height: canvas.height,
                    duration: Math.round(video.duration),
                    name: file.name,
                    size: this.formatSize(file.size)
                });

                URL.revokeObjectURL(video.src);
            };

            video.onerror = reject;
            video.src = URL.createObjectURL(file);
        });
    },

    /**
     * Create audio preview
     */
    createAudioPreview(file) {
        return new Promise((resolve, reject) => {
            const audio = document.createElement('audio');
            audio.preload = 'metadata';

            audio.onloadedmetadata = () => {
                resolve({
                    type: 'audio',
                    icon: '🎵',
                    duration: Math.round(audio.duration),
                    name: file.name,
                    size: this.formatSize(file.size)
                });

                URL.revokeObjectURL(audio.src);
            };

            audio.onerror = reject;
            audio.src = URL.createObjectURL(file);
        });
    },

    /**
     * Create PDF preview
     */
    async createPDFPreview(file) {
        return {
            type: 'pdf',
            icon: '📄',
            name: file.name,
            size: this.formatSize(file.size)
        };
    },

    /**
     * Create generic file preview
     */
    createGenericPreview(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const icons = {
            doc: '📝', docx: '📝',
            xls: '📊', xlsx: '📊',
            ppt: '📑', pptx: '📑',
            zip: '📦', rar: '📦',
            txt: '📃',
            js: '💻', css: '🎨', html: '🌐'
        };

        return {
            type: 'file',
            icon: icons[ext] || '📁',
            name: file.name,
            size: this.formatSize(file.size),
            extension: ext.toUpperCase()
        };
    },

    /**
     * Format file size
     */
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(1) + ' GB';
    },

    /**
     * Render preview HTML
     */
    renderPreview(preview) {
        if (preview.type === 'image' || preview.type === 'video') {
            return `
                <div class="file-preview file-preview-${preview.type}">
                    <img src="${preview.url}" alt="${preview.name}" 
                         style="max-width: ${preview.width}px; max-height: ${preview.height}px;">
                    ${preview.type === 'video' ? '<span class="preview-play">▶</span>' : ''}
                    <div class="preview-info">
                        <span class="preview-name">${preview.name}</span>
                        <span class="preview-size">${preview.size}</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="file-preview file-preview-${preview.type}">
                <span class="preview-icon">${preview.icon}</span>
                <div class="preview-info">
                    <span class="preview-name">${preview.name}</span>
                    <span class="preview-size">${preview.size}</span>
                </div>
            </div>
        `;
    }
};

// Styles
const previewStyles = document.createElement('style');
previewStyles.textContent = `
    .file-preview {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3);
        background: var(--bg-surface);
        border-radius: var(--radius-lg);
        position: relative;
    }
    
    .file-preview img {
        border-radius: var(--radius-md);
        object-fit: cover;
    }
    
    .preview-play {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.6);
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    }
    
    .preview-icon {
        font-size: 32px;
    }
    
    .preview-info {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-width: 0;
    }
    
    .preview-name {
        font-weight: var(--font-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .preview-size {
        font-size: var(--text-sm);
        color: var(--text-muted);
    }
`;

document.head.appendChild(previewStyles);

// Export
window.FilePreview = FilePreview;
