/**
 * SMMFamy - Dark Mode Component
 * Theme switching with system preference detection | ~200 lines
 */

const DarkMode = {
    storageKey: 'smmfamy_theme',
    defaultTheme: 'light',
    currentTheme: null,

    /**
     * Initialize dark mode
     */
    init() {
        // Get saved theme or detect system preference
        const savedTheme = Storage.get(this.storageKey);

        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.currentTheme = 'dark';
        } else {
            this.currentTheme = this.defaultTheme;
        }

        this.apply();
        this.setupSystemListener();
        this.setupToggle();
    },

    /**
     * Apply current theme
     */
    apply() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);

        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = this.currentTheme === 'dark' ? '#1a1a2e' : '#a855f7';
        }

        // Dispatch event
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: this.currentTheme }
        }));
    },

    /**
     * Toggle between light and dark
     */
    toggle() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        Storage.set(this.storageKey, this.currentTheme);
        this.apply();
        this.updateToggleButtons();
    },

    /**
     * Set specific theme
     */
    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') return;
        this.currentTheme = theme;
        Storage.set(this.storageKey, this.currentTheme);
        this.apply();
        this.updateToggleButtons();
    },

    /**
     * Get current theme
     */
    getTheme() {
        return this.currentTheme;
    },

    /**
     * Check if dark mode is active
     */
    isDark() {
        return this.currentTheme === 'dark';
    },

    /**
     * Setup system preference listener
     */
    setupSystemListener() {
        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!Storage.get(this.storageKey)) {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.apply();
                this.updateToggleButtons();
            }
        });
    },

    /**
     * Setup toggle buttons
     */
    setupToggle() {
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.addEventListener('click', () => this.toggle());
        });

        this.updateToggleButtons();
    },

    /**
     * Update toggle button states
     */
    updateToggleButtons() {
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            const icon = btn.querySelector('.theme-icon');
            if (icon) {
                icon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
            }
            btn.setAttribute('aria-label',
                this.currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            );
        });
    }
};

// Dark mode CSS variables
const darkModeStyles = document.createElement('style');
darkModeStyles.textContent = `
    :root {
        /* Light theme (default) */
        --bg-page: #faf5ff;
        --bg-card: #ffffff;
        --bg-surface: #f8f5fc;
        --bg-muted: #f3e8ff;
        
        --text-primary: #1e1b4b;
        --text-secondary: #4c1d95;
        --text-muted: #7c3aed;
        
        --border-default: rgba(139, 92, 246, 0.2);
        --border-light: rgba(139, 92, 246, 0.1);
    }
    
    [data-theme="dark"] {
        --bg-page: #0f0f1a;
        --bg-card: #1a1a2e;
        --bg-surface: #252545;
        --bg-muted: #353560;
        
        --text-primary: #f8f5fc;
        --text-secondary: #d8b4fe;
        --text-muted: #a78bfa;
        
        --border-default: rgba(139, 92, 246, 0.3);
        --border-light: rgba(139, 92, 246, 0.15);
        
        --color-primary-50: rgba(168, 85, 247, 0.1);
        --color-primary-100: rgba(168, 85, 247, 0.2);
        
        --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
        --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
        --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
        --shadow-xl: 0 25px 50px rgba(0, 0, 0, 0.6);
    }
    
    [data-theme="dark"] .navbar {
        background: rgba(26, 26, 46, 0.95);
    }
    
    [data-theme="dark"] .form-input,
    [data-theme="dark"] .form-select,
    [data-theme="dark"] .form-textarea {
        background: var(--bg-surface);
        border-color: var(--border-default);
        color: var(--text-primary);
    }
    
    [data-theme="dark"] .form-input:focus,
    [data-theme="dark"] .form-select:focus,
    [data-theme="dark"] .form-textarea:focus {
        background: var(--bg-card);
    }
    
    [data-theme="dark"] .btn-secondary {
        background: var(--bg-surface);
        color: var(--text-primary);
        border-color: var(--border-default);
    }
    
    [data-theme="dark"] .btn-ghost {
        color: var(--text-secondary);
    }
    
    [data-theme="dark"] .card,
    [data-theme="dark"] .table {
        background: var(--bg-card);
    }
    
    [data-theme="dark"] .table th {
        background: var(--bg-surface);
    }
    
    [data-theme="dark"] .table tr:hover {
        background: var(--bg-muted);
    }
    
    [data-theme="dark"] .badge {
        background: var(--bg-surface);
    }
    
    [data-theme="dark"] .footer {
        background: var(--bg-card);
        border-top-color: var(--border-default);
    }
    
    /* Theme toggle button */
    .theme-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md);
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .theme-toggle:hover {
        background: var(--bg-muted);
    }
    
    .theme-icon {
        font-size: 18px;
    }
`;

document.head.appendChild(darkModeStyles);

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DarkMode.init());
} else {
    DarkMode.init();
}

// Export
window.DarkMode = DarkMode;
