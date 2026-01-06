/**
 * SMMFamy - Tabs Component
 * Accessible tab navigation | ~250 lines
 */

const Tabs = {
    instances: new Map(),

    /**
     * Initialize all tabs
     */
    init() {
        document.querySelectorAll('[data-tabs]').forEach(element => {
            this.setup(element);
        });
    },

    /**
     * Setup tabs on element
     */
    setup(element, options = {}) {
        const id = element.id || `tabs-${Date.now()}`;
        if (!element.id) element.id = id;

        const defaults = {
            activeClass: 'tab-active',
            animated: true,
            onChange: null
        };

        const config = { ...defaults, ...options };

        const tabList = element.querySelector('[data-tab-list]');
        const tabs = Array.from(element.querySelectorAll('[data-tab]'));
        const panels = Array.from(element.querySelectorAll('[data-tab-panel]'));

        if (!tabList || tabs.length === 0) return;

        // Set ARIA attributes
        tabList.setAttribute('role', 'tablist');

        tabs.forEach((tab, index) => {
            const panelId = tab.getAttribute('data-tab');
            const panel = panels.find(p => p.getAttribute('data-tab-panel') === panelId);
            const tabId = `${id}-tab-${index}`;

            tab.setAttribute('role', 'tab');
            tab.setAttribute('id', tabId);
            tab.setAttribute('tabindex', tab.classList.contains(config.activeClass) ? '0' : '-1');
            tab.setAttribute('aria-selected', tab.classList.contains(config.activeClass) ? 'true' : 'false');

            if (panel) {
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', tabId);
                panel.setAttribute('tabindex', '0');
            }

            // Click handler
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.activate(element, panelId);
            });
        });

        // Keyboard navigation
        tabList.addEventListener('keydown', (e) => {
            this.handleKeydown(e, tabs, config);
        });

        // Store instance
        this.instances.set(id, {
            element,
            tabs,
            panels,
            config,
            activeTab: tabs.find(t => t.classList.contains(config.activeClass))?.getAttribute('data-tab')
        });

        return this.instances.get(id);
    },

    /**
     * Activate a tab
     */
    activate(element, tabId) {
        const id = element.id;
        const instance = this.instances.get(id);
        if (!instance) return;

        const { tabs, panels, config } = instance;

        // Deactivate all
        tabs.forEach(tab => {
            tab.classList.remove(config.activeClass);
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '-1');
        });

        panels.forEach(panel => {
            panel.hidden = true;
            panel.classList.remove('tab-panel-active');
        });

        // Activate selected
        const activeTab = tabs.find(t => t.getAttribute('data-tab') === tabId);
        const activePanel = panels.find(p => p.getAttribute('data-tab-panel') === tabId);

        if (activeTab) {
            activeTab.classList.add(config.activeClass);
            activeTab.setAttribute('aria-selected', 'true');
            activeTab.setAttribute('tabindex', '0');
        }

        if (activePanel) {
            activePanel.hidden = false;
            if (config.animated) {
                requestAnimationFrame(() => {
                    activePanel.classList.add('tab-panel-active');
                });
            }
        }

        // Update instance
        instance.activeTab = tabId;

        // Callback
        if (config.onChange) {
            config.onChange(tabId, activeTab, activePanel);
        }

        // Dispatch event
        element.dispatchEvent(new CustomEvent('tabs:change', {
            detail: { tabId, tab: activeTab, panel: activePanel }
        }));
    },

    /**
     * Handle keyboard navigation
     */
    handleKeydown(e, tabs, config) {
        const currentIndex = tabs.findIndex(t => t.classList.contains(config.activeClass));
        let newIndex;

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                break;

            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                break;

            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;

            case 'End':
                e.preventDefault();
                newIndex = tabs.length - 1;
                break;

            default:
                return;
        }

        const newTab = tabs[newIndex];
        if (newTab) {
            newTab.click();
            newTab.focus();
        }
    },

    /**
     * Get active tab
     */
    getActive(element) {
        const id = element.id;
        const instance = this.instances.get(id);
        return instance?.activeTab;
    },

    /**
     * Create tabs programmatically
     */
    create(containerId, tabsData, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        container.setAttribute('data-tabs', '');

        let html = '<div data-tab-list class="tab-list">';
        tabsData.forEach((tab, index) => {
            html += `
                <button data-tab="${tab.id}" class="tab-item ${index === 0 ? 'tab-active' : ''}">
                    ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
                    ${tab.label}
                </button>
            `;
        });
        html += '</div>';

        tabsData.forEach((tab, index) => {
            html += `
                <div data-tab-panel="${tab.id}" class="tab-panel" ${index !== 0 ? 'hidden' : ''}>
                    ${tab.content || ''}
                </div>
            `;
        });

        container.innerHTML = html;
        return this.setup(container, options);
    }
};

// Tab styles
const tabStyles = document.createElement('style');
tabStyles.textContent = `
    [data-tabs] {
        display: flex;
        flex-direction: column;
    }
    
    .tab-list {
        display: flex;
        gap: var(--space-1);
        padding: var(--space-1);
        background: var(--bg-surface);
        border-radius: var(--radius-lg);
        overflow-x: auto;
    }
    
    .tab-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        background: transparent;
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: var(--font-medium);
        color: var(--text-muted);
        cursor: pointer;
        white-space: nowrap;
        transition: var(--transition-fast);
    }
    
    .tab-item:hover {
        color: var(--text-primary);
        background: var(--bg-muted);
    }
    
    .tab-item.tab-active {
        color: var(--color-primary-600);
        background: var(--bg-card);
        box-shadow: var(--shadow-sm);
    }
    
    .tab-panel {
        padding: var(--space-4) 0;
    }
    
    .tab-panel[hidden] {
        display: none;
    }
    
    .tab-panel.tab-panel-active {
        animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

document.head.appendChild(tabStyles);

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Tabs.init());
} else {
    Tabs.init();
}

// Export for use
window.Tabs = Tabs;
