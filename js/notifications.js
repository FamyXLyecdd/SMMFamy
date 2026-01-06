/**
 * SMMFamy - Notifications System
 * Toast notifications, alerts, and confirm dialogs | ~250 lines
 */

const Notify = {
    container: null,
    queue: [],
    maxVisible: 5,

    /**
     * Initialize notification container
     */
    init() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'toastContainer';
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    },

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: success, error, warning, info
     * @param {object} options - Additional options
     */
    toast(message, type = 'info', options = {}) {
        this.init();

        const defaults = {
            duration: 4000,
            closable: true,
            icon: true
        };

        const config = { ...defaults, ...options };

        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            ${config.icon ? `<span class="toast-icon">${icons[type] || icons.info}</span>` : ''}
            <span class="toast-message">${message}</span>
            ${config.closable ? '<button class="toast-close">×</button>' : ''}
        `;

        if (config.closable) {
            toast.querySelector('.toast-close').addEventListener('click', () => {
                this.dismiss(toast);
            });
        }

        // Add to container
        this.container.appendChild(toast);

        // Manage queue
        this.queue.push(toast);
        if (this.queue.length > this.maxVisible) {
            this.dismiss(this.queue[0]);
        }

        // Auto dismiss
        if (config.duration > 0) {
            setTimeout(() => this.dismiss(toast), config.duration);
        }

        return toast;
    },

    /**
     * Dismiss a toast
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.add('exit');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            const index = this.queue.indexOf(toast);
            if (index > -1) {
                this.queue.splice(index, 1);
            }
        }, 300);
    },

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        [...this.queue].forEach(toast => this.dismiss(toast));
    },

    // Shorthand methods
    success(message, options = {}) {
        return this.toast(message, 'success', options);
    },

    error(message, options = {}) {
        return this.toast(message, 'error', { duration: 6000, ...options });
    },

    warning(message, options = {}) {
        return this.toast(message, 'warning', options);
    },

    info(message, options = {}) {
        return this.toast(message, 'info', options);
    },

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {object} options - Dialog options
     * @returns {Promise<boolean>}
     */
    async confirm(message, options = {}) {
        const defaults = {
            title: 'Confirm',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            type: 'primary', // primary, danger, warning
            icon: '?'
        };

        const config = { ...defaults, ...options };

        return new Promise((resolve) => {
            // Create backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop open';

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal modal-sm open';
            modal.innerHTML = `
                <div class="modal-header">
                    <h3 class="modal-title">${config.title}</h3>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: var(--space-4);">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary btn-cancel">${config.cancelText}</button>
                    <button class="btn btn-${config.type} btn-confirm">${config.confirmText}</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(modal);

            const close = (result) => {
                backdrop.classList.remove('open');
                modal.classList.remove('open');
                setTimeout(() => {
                    backdrop.remove();
                    modal.remove();
                }, 300);
                resolve(result);
            };

            modal.querySelector('.btn-cancel').addEventListener('click', () => close(false));
            modal.querySelector('.btn-confirm').addEventListener('click', () => close(true));
            backdrop.addEventListener('click', () => close(false));
        });
    },

    /**
     * Show alert dialog
     */
    async alert(message, options = {}) {
        const defaults = {
            title: 'Notice',
            buttonText: 'OK',
            type: 'primary'
        };

        const config = { ...defaults, ...options };

        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop open';

            const modal = document.createElement('div');
            modal.className = 'modal modal-sm open';
            modal.innerHTML = `
                <div class="modal-header">
                    <h3 class="modal-title">${config.title}</h3>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: var(--space-4);">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-${config.type} btn-ok" style="width: 100%;">${config.buttonText}</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(modal);

            const close = () => {
                backdrop.classList.remove('open');
                modal.classList.remove('open');
                setTimeout(() => {
                    backdrop.remove();
                    modal.remove();
                }, 300);
                resolve();
            };

            modal.querySelector('.btn-ok').addEventListener('click', close);
        });
    },

    /**
     * Show prompt dialog
     */
    async prompt(message, options = {}) {
        const defaults = {
            title: 'Input',
            placeholder: '',
            defaultValue: '',
            confirmText: 'OK',
            cancelText: 'Cancel',
            type: 'text'
        };

        const config = { ...defaults, ...options };

        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop open';

            const modal = document.createElement('div');
            modal.className = 'modal modal-sm open';
            modal.innerHTML = `
                <div class="modal-header">
                    <h3 class="modal-title">${config.title}</h3>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: var(--space-3);">${message}</p>
                    <input type="${config.type}" class="form-input prompt-input" 
                           placeholder="${config.placeholder}" 
                           value="${config.defaultValue}">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary btn-cancel">${config.cancelText}</button>
                    <button class="btn btn-primary btn-confirm">${config.confirmText}</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(modal);

            const input = modal.querySelector('.prompt-input');
            input.focus();
            input.select();

            const close = (value) => {
                backdrop.classList.remove('open');
                modal.classList.remove('open');
                setTimeout(() => {
                    backdrop.remove();
                    modal.remove();
                }, 300);
                resolve(value);
            };

            modal.querySelector('.btn-cancel').addEventListener('click', () => close(null));
            modal.querySelector('.btn-confirm').addEventListener('click', () => close(input.value));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') close(input.value);
            });
            backdrop.addEventListener('click', () => close(null));
        });
    },

    /**
     * Show loading overlay
     */
    loading(message = 'Loading...', options = {}) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop open';
        backdrop.id = 'loadingOverlay';
        backdrop.innerHTML = `
            <div style="text-align: center; color: white;">
                <div class="spinner spinner-xl" style="margin: 0 auto var(--space-4); border-color: rgba(255,255,255,0.3); border-top-color: white;"></div>
                <p style="font-weight: 600;">${message}</p>
            </div>
        `;

        document.body.appendChild(backdrop);

        return {
            update: (msg) => {
                backdrop.querySelector('p').textContent = msg;
            },
            close: () => {
                backdrop.classList.remove('open');
                setTimeout(() => backdrop.remove(), 300);
            }
        };
    }
};

// Export for use
window.Notify = Notify;
