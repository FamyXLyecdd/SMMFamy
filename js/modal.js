/**
 * SMMFamy - Modal System
 * Full-featured modal component with stacking | ~400 lines
 */

const Modal = {
    stack: [],
    idCounter: 0,

    /**
     * Default options
     */
    defaults: {
        title: '',
        content: '',
        size: 'md', // sm, md, lg, xl, full
        closable: true,
        closeOnEscape: true,
        closeOnBackdrop: true,
        showClose: true,
        animate: true,
        centered: true,
        scrollable: true,
        footer: null,
        onOpen: null,
        onClose: null,
        className: ''
    },

    /**
     * Open a modal
     */
    open(options = {}) {
        const config = { ...this.defaults, ...options };
        const id = `modal-${++this.idCounter}`;

        // Create modal structure
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = `modal-overlay ${config.animate ? 'modal-animate' : ''} ${config.centered ? 'modal-centered' : ''}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `${id}-title`);

        const sizeClass = {
            'sm': 'modal-sm',
            'md': 'modal-md',
            'lg': 'modal-lg',
            'xl': 'modal-xl',
            'full': 'modal-full'
        }[config.size] || 'modal-md';

        let footerHtml = '';
        if (config.footer) {
            footerHtml = `<div class="modal-footer">${config.footer}</div>`;
        }

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-container ${sizeClass} ${config.className}">
                ${config.title ? `
                    <div class="modal-header">
                        <h3 class="modal-title" id="${id}-title">${config.title}</h3>
                        ${config.showClose && config.closable ? `
                            <button class="modal-close" aria-label="Close" data-modal-close>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
                <div class="modal-body ${config.scrollable ? 'modal-scrollable' : ''}">
                    ${config.content}
                </div>
                ${footerHtml}
            </div>
        `;

        // Add to DOM
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Store modal data
        const modalData = {
            id,
            element: modal,
            config,
            previousFocus: document.activeElement
        };
        this.stack.push(modalData);

        // Event listeners
        if (config.closable) {
            // Close button
            const closeBtn = modal.querySelector('[data-modal-close]');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close(id));
            }

            // Backdrop click
            if (config.closeOnBackdrop) {
                const backdrop = modal.querySelector('.modal-backdrop');
                backdrop.addEventListener('click', () => this.close(id));
            }

            // Escape key
            if (config.closeOnEscape) {
                modal.escapeHandler = (e) => {
                    if (e.key === 'Escape' && this.stack[this.stack.length - 1]?.id === id) {
                        this.close(id);
                    }
                };
                document.addEventListener('keydown', modal.escapeHandler);
            }
        }

        // Trigger animation
        requestAnimationFrame(() => {
            modal.classList.add('modal-open');
        });

        // Focus first focusable element
        setTimeout(() => {
            const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) focusable.focus();
        }, 100);

        // Callback
        if (config.onOpen) {
            config.onOpen(modal, id);
        }

        return {
            id,
            element: modal,
            close: () => this.close(id),
            setContent: (content) => this.setContent(id, content),
            setTitle: (title) => this.setTitle(id, title)
        };
    },

    /**
     * Close a modal by ID or close top modal
     */
    close(id = null) {
        if (!id && this.stack.length > 0) {
            id = this.stack[this.stack.length - 1].id;
        }

        const index = this.stack.findIndex(m => m.id === id);
        if (index === -1) return;

        const modalData = this.stack[index];
        const modal = modalData.element;

        // Remove event listener
        if (modal.escapeHandler) {
            document.removeEventListener('keydown', modal.escapeHandler);
        }

        // Animate out
        modal.classList.remove('modal-open');
        modal.classList.add('modal-closing');

        setTimeout(() => {
            modal.remove();
            this.stack.splice(index, 1);

            // Restore body scroll if no more modals
            if (this.stack.length === 0) {
                document.body.style.overflow = '';
            }

            // Restore focus
            if (modalData.previousFocus) {
                modalData.previousFocus.focus();
            }

            // Callback
            if (modalData.config.onClose) {
                modalData.config.onClose();
            }
        }, 200);
    },

    /**
     * Close all modals
     */
    closeAll() {
        while (this.stack.length > 0) {
            this.close();
        }
    },

    /**
     * Update modal content
     */
    setContent(id, content) {
        const modalData = this.stack.find(m => m.id === id);
        if (!modalData) return;

        const body = modalData.element.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;
        }
    },

    /**
     * Update modal title
     */
    setTitle(id, title) {
        const modalData = this.stack.find(m => m.id === id);
        if (!modalData) return;

        const titleEl = modalData.element.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    },

    /**
     * Alert modal
     */
    alert(message, title = 'Notice') {
        return new Promise((resolve) => {
            this.open({
                title,
                content: `<p>${message}</p>`,
                size: 'sm',
                footer: `
                    <button class="btn btn-primary" data-modal-close>OK</button>
                `,
                onClose: resolve
            });
        });
    },

    /**
     * Confirm modal
     */
    confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const modal = this.open({
                title,
                content: `<p>${message}</p>`,
                size: 'sm',
                closeOnBackdrop: false,
                footer: `
                    <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
                    <button class="btn btn-primary modal-confirm-btn">Confirm</button>
                `,
                onClose: () => resolve(false)
            });

            modal.element.querySelector('.modal-cancel-btn').addEventListener('click', () => {
                modal.close();
                resolve(false);
            });

            modal.element.querySelector('.modal-confirm-btn').addEventListener('click', () => {
                modal.close();
                resolve(true);
            });
        });
    },

    /**
     * Prompt modal
     */
    prompt(message, defaultValue = '', title = 'Input') {
        return new Promise((resolve) => {
            const inputId = `prompt-input-${this.idCounter}`;

            const modal = this.open({
                title,
                content: `
                    <p>${message}</p>
                    <div class="form-group" style="margin-top: var(--space-4);">
                        <input type="text" class="form-input" id="${inputId}" value="${defaultValue}">
                    </div>
                `,
                size: 'sm',
                closeOnBackdrop: false,
                footer: `
                    <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
                    <button class="btn btn-primary modal-confirm-btn">OK</button>
                `,
                onClose: () => resolve(null)
            });

            const input = modal.element.querySelector(`#${inputId}`);
            input.focus();
            input.select();

            modal.element.querySelector('.modal-cancel-btn').addEventListener('click', () => {
                modal.close();
                resolve(null);
            });

            modal.element.querySelector('.modal-confirm-btn').addEventListener('click', () => {
                const value = input.value;
                modal.close();
                resolve(value);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = input.value;
                    modal.close();
                    resolve(value);
                }
            });
        });
    },

    /**
     * Loading modal
     */
    loading(message = 'Loading...') {
        return this.open({
            content: `
                <div class="modal-loading">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `,
            size: 'sm',
            closable: false,
            showClose: false,
            centered: true
        });
    },

    /**
     * Image modal (lightbox)
     */
    image(src, alt = '') {
        return this.open({
            content: `
                <img src="${src}" alt="${alt}" class="modal-image">
            `,
            size: 'lg',
            className: 'modal-image-container',
            centered: true
        });
    }
};

// Modal styles
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: var(--space-6);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
    }
    
    .modal-overlay.modal-centered {
        align-items: center;
    }
    
    .modal-overlay.modal-open {
        opacity: 1;
        visibility: visible;
    }
    
    .modal-overlay.modal-closing {
        opacity: 0;
    }
    
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    }
    
    .modal-container {
        position: relative;
        background: var(--bg-card);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-xl);
        max-height: calc(100vh - 48px);
        display: flex;
        flex-direction: column;
        transform: scale(0.95) translateY(10px);
        transition: transform 0.2s ease;
    }
    
    .modal-open .modal-container {
        transform: scale(1) translateY(0);
    }
    
    .modal-closing .modal-container {
        transform: scale(0.95) translateY(10px);
    }
    
    .modal-sm { width: 100%; max-width: 400px; }
    .modal-md { width: 100%; max-width: 560px; }
    .modal-lg { width: 100%; max-width: 800px; }
    .modal-xl { width: 100%; max-width: 1140px; }
    .modal-full { width: 100%; max-width: calc(100vw - 48px); height: calc(100vh - 48px); }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-4) var(--space-5);
        border-bottom: 1px solid var(--border-default);
    }
    
    .modal-title {
        font-size: var(--text-lg);
        font-weight: var(--font-bold);
        margin: 0;
    }
    
    .modal-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: var(--radius-md);
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .modal-close:hover {
        background: var(--bg-muted);
        color: var(--text-primary);
    }
    
    .modal-body {
        padding: var(--space-5);
        flex: 1;
        overflow: auto;
    }
    
    .modal-body.modal-scrollable {
        overflow-y: auto;
    }
    
    .modal-footer {
        display: flex;
        gap: var(--space-2);
        justify-content: flex-end;
        padding: var(--space-4) var(--space-5);
        border-top: 1px solid var(--border-default);
        background: var(--bg-surface);
    }
    
    .modal-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-6);
    }
    
    .modal-loading .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid var(--border-default);
        border-top-color: var(--color-primary-500);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .modal-image-container .modal-body {
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
    }
    
    .modal-image {
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

document.head.appendChild(modalStyles);

// Export for use
window.Modal = Modal;
