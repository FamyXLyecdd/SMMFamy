/**
 * SMMFamy - Copy to Clipboard Component
 * Enhanced clipboard functionality | ~150 lines
 */

const Clipboard = {
    /**
     * Copy text to clipboard
     */
    async copy(text, showNotification = true) {
        try {
            // Modern API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                this.fallbackCopy(text);
            }

            if (showNotification && window.Notify) {
                Notify.success('Copied to clipboard');
            }

            return true;
        } catch (err) {
            console.error('Copy failed:', err);

            if (showNotification && window.Notify) {
                Notify.error('Failed to copy');
            }

            return false;
        }
    },

    /**
     * Fallback copy method
     */
    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand('copy');
        } finally {
            document.body.removeChild(textarea);
        }
    },

    /**
     * Copy from element
     */
    async copyFromElement(element, showNotification = true) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        if (!element) return false;

        const text = element.value || element.textContent || element.innerText;
        return this.copy(text.trim(), showNotification);
    },

    /**
     * Initialize copy buttons
     */
    init() {
        document.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();

                const target = btn.dataset.copy;
                const text = btn.dataset.copyText;

                let success = false;

                if (text) {
                    success = await this.copy(text);
                } else if (target) {
                    success = await this.copyFromElement(target);
                }

                if (success) {
                    this.showCopiedState(btn);
                }
            });
        });
    },

    /**
     * Show copied state on button
     */
    showCopiedState(btn) {
        const originalHtml = btn.innerHTML;
        const originalText = btn.textContent;

        btn.classList.add('copied');
        btn.innerHTML = btn.dataset.copiedText || '✓ Copied!';

        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = originalHtml;
        }, 2000);
    },

    /**
     * Read from clipboard
     */
    async read() {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                return await navigator.clipboard.readText();
            }
            return null;
        } catch (err) {
            console.error('Read clipboard failed:', err);
            return null;
        }
    }
};

// Clipboard button styles
const clipboardStyles = document.createElement('style');
clipboardStyles.textContent = `
    [data-copy] {
        cursor: pointer;
        user-select: none;
    }
    
    [data-copy].copied {
        pointer-events: none;
    }
    
    .copy-input-wrapper {
        display: flex;
        gap: var(--space-2);
    }
    
    .copy-input-wrapper input {
        flex: 1;
    }
    
    .copy-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
    }
    
    .copy-icon {
        width: 16px;
        height: 16px;
    }
`;

document.head.appendChild(clipboardStyles);

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Clipboard.init());
} else {
    Clipboard.init();
}

// Export
window.Clipboard = Clipboard;
