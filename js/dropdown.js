/**
 * SMMFamy - Dropdown Component
 * Accessible dropdown menus | ~300 lines
 */

const Dropdown = {
    activeDropdown: null,

    /**
     * Initialize all dropdowns
     */
    init() {
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.activeDropdown && !this.activeDropdown.contains(e.target)) {
                this.close(this.activeDropdown);
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeDropdown) {
                this.close(this.activeDropdown);
            }
        });

        // Initialize existing dropdowns
        document.querySelectorAll('[data-dropdown]').forEach(dropdown => {
            this.setup(dropdown);
        });
    },

    /**
     * Setup a dropdown
     */
    setup(element) {
        const trigger = element.querySelector('[data-dropdown-trigger]');
        const menu = element.querySelector('[data-dropdown-menu]');

        if (!trigger || !menu) return;

        // Trigger click
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle(element);
        });

        // Keyboard navigation
        element.addEventListener('keydown', (e) => {
            this.handleKeydown(e, element, menu);
        });

        // Item click
        menu.querySelectorAll('[data-dropdown-item]').forEach(item => {
            item.addEventListener('click', () => {
                const value = item.dataset.value;
                const text = item.textContent;

                // Dispatch custom event
                element.dispatchEvent(new CustomEvent('dropdown:select', {
                    detail: { value, text, item }
                }));

                this.close(element);
            });
        });
    },

    /**
     * Toggle dropdown
     */
    toggle(element) {
        if (element.classList.contains('dropdown-open')) {
            this.close(element);
        } else {
            this.open(element);
        }
    },

    /**
     * Open dropdown
     */
    open(element) {
        // Close any open dropdown
        if (this.activeDropdown && this.activeDropdown !== element) {
            this.close(this.activeDropdown);
        }

        element.classList.add('dropdown-open');
        this.activeDropdown = element;

        // Position menu
        const menu = element.querySelector('[data-dropdown-menu]');
        this.position(element, menu);

        // Focus first item
        const firstItem = menu.querySelector('[data-dropdown-item]:not([disabled])');
        if (firstItem) {
            firstItem.focus();
        }

        // Dispatch event
        element.dispatchEvent(new CustomEvent('dropdown:open'));
    },

    /**
     * Close dropdown
     */
    close(element) {
        element.classList.remove('dropdown-open');

        if (this.activeDropdown === element) {
            this.activeDropdown = null;
        }

        // Return focus to trigger
        const trigger = element.querySelector('[data-dropdown-trigger]');
        if (trigger) {
            trigger.focus();
        }

        // Dispatch event
        element.dispatchEvent(new CustomEvent('dropdown:close'));
    },

    /**
     * Position menu based on available space
     */
    position(element, menu) {
        const trigger = element.querySelector('[data-dropdown-trigger]');
        const rect = trigger.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const spaceRight = window.innerWidth - rect.left;

        // Vertical positioning
        if (spaceBelow < menuRect.height && spaceAbove > spaceBelow) {
            menu.classList.add('dropdown-up');
        } else {
            menu.classList.remove('dropdown-up');
        }

        // Horizontal positioning
        if (spaceRight < menuRect.width) {
            menu.classList.add('dropdown-right');
        } else {
            menu.classList.remove('dropdown-right');
        }
    },

    /**
     * Handle keyboard navigation
     */
    handleKeydown(e, element, menu) {
        const items = Array.from(menu.querySelectorAll('[data-dropdown-item]:not([disabled])'));
        const currentIndex = items.indexOf(document.activeElement);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!element.classList.contains('dropdown-open')) {
                    this.open(element);
                } else {
                    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                    items[nextIndex]?.focus();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (element.classList.contains('dropdown-open')) {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                    items[prevIndex]?.focus();
                }
                break;

            case 'Enter':
            case ' ':
                e.preventDefault();
                if (document.activeElement.hasAttribute('data-dropdown-item')) {
                    document.activeElement.click();
                } else {
                    this.toggle(element);
                }
                break;

            case 'Home':
                e.preventDefault();
                items[0]?.focus();
                break;

            case 'End':
                e.preventDefault();
                items[items.length - 1]?.focus();
                break;

            case 'Tab':
                this.close(element);
                break;
        }
    },

    /**
     * Create dropdown programmatically
     */
    create(triggerElement, items, options = {}) {
        const defaults = {
            position: 'bottom-start',
            closeOnSelect: true,
            minWidth: 160
        };

        const config = { ...defaults, ...options };

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown';
        wrapper.setAttribute('data-dropdown', '');

        // Wrap trigger
        triggerElement.setAttribute('data-dropdown-trigger', '');
        wrapper.appendChild(triggerElement);

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.setAttribute('data-dropdown-menu', '');
        menu.style.minWidth = `${config.minWidth}px`;

        items.forEach((item, index) => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.className = 'dropdown-divider';
                menu.appendChild(divider);
            } else if (item.header) {
                const header = document.createElement('div');
                header.className = 'dropdown-header';
                header.textContent = item.header;
                menu.appendChild(header);
            } else {
                const menuItem = document.createElement('button');
                menuItem.className = `dropdown-item ${item.className || ''}`;
                menuItem.setAttribute('data-dropdown-item', '');
                menuItem.setAttribute('data-value', item.value || index);
                if (item.disabled) menuItem.disabled = true;

                if (item.icon) {
                    menuItem.innerHTML = `<span class="dropdown-icon">${item.icon}</span> ${item.label}`;
                } else {
                    menuItem.textContent = item.label;
                }

                if (item.onClick) {
                    menuItem.addEventListener('click', item.onClick);
                }

                menu.appendChild(menuItem);
            }
        });

        wrapper.appendChild(menu);
        this.setup(wrapper);

        return wrapper;
    }
};

// Dropdown styles
const dropdownStyles = document.createElement('style');
dropdownStyles.textContent = `
    .dropdown {
        position: relative;
        display: inline-block;
    }
    
    .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 1000;
        min-width: 160px;
        padding: var(--space-2);
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        opacity: 0;
        visibility: hidden;
        transform: translateY(-8px);
        transition: opacity 0.15s, transform 0.15s, visibility 0.15s;
    }
    
    .dropdown-open .dropdown-menu {
        opacity: 1;
        visibility: visible;
        transform: translateY(4px);
    }
    
    .dropdown-menu.dropdown-up {
        top: auto;
        bottom: 100%;
        transform: translateY(8px);
    }
    
    .dropdown-open .dropdown-menu.dropdown-up {
        transform: translateY(-4px);
    }
    
    .dropdown-menu.dropdown-right {
        left: auto;
        right: 0;
    }
    
    .dropdown-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        width: 100%;
        padding: var(--space-2) var(--space-3);
        background: transparent;
        border: none;
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--text-sm);
        text-align: left;
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .dropdown-item:hover,
    .dropdown-item:focus {
        background: var(--bg-muted);
        outline: none;
    }
    
    .dropdown-item:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .dropdown-item:disabled:hover {
        background: transparent;
    }
    
    .dropdown-icon {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .dropdown-divider {
        height: 1px;
        margin: var(--space-2) 0;
        background: var(--border-default);
    }
    
    .dropdown-header {
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
`;

document.head.appendChild(dropdownStyles);

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Dropdown.init());
} else {
    Dropdown.init();
}

// Export for use
window.Dropdown = Dropdown;
