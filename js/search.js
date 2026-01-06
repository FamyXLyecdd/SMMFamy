/**
 * SMMFamy - Search Component
 * Global search with suggestions | ~300 lines
 */

const Search = {
    instances: new Map(),

    /**
     * Create search component
     */
    create(inputId, options = {}) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        if (!input) return null;

        const config = {
            placeholder: 'Search...',
            minChars: 2,
            debounceMs: 300,
            maxResults: 10,
            showRecent: true,
            maxRecent: 5,
            categories: [],
            onSearch: null,
            onSelect: null,
            highlightMatches: true,
            ...options
        };

        const search = {
            input,
            config,
            dropdown: null,
            results: [],
            selectedIndex: -1,
            isOpen: false
        };

        this.setup(search);
        this.instances.set(input, search);

        return search;
    },

    /**
     * Setup search
     */
    setup(search) {
        const { input, config } = search;

        // Wrap input
        const wrapper = document.createElement('div');
        wrapper.className = 'search-wrapper';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        // Create dropdown
        search.dropdown = document.createElement('div');
        search.dropdown.className = 'search-dropdown';
        wrapper.appendChild(search.dropdown);

        // Input handlers
        input.addEventListener('input', Utils.debounce(() => {
            this.handleInput(search);
        }, config.debounceMs));

        input.addEventListener('focus', () => {
            if (input.value.length >= config.minChars || config.showRecent) {
                this.open(search);
            }
        });

        input.addEventListener('keydown', (e) => {
            this.handleKeydown(search, e);
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                this.close(search);
            }
        });

        // Set placeholder
        input.placeholder = config.placeholder;
    },

    /**
     * Handle input
     */
    async handleInput(search) {
        const { input, config } = search;
        const query = input.value.trim();

        if (query.length < config.minChars) {
            if (config.showRecent) {
                this.showRecent(search);
            } else {
                this.close(search);
            }
            return;
        }

        // Show loading
        search.dropdown.innerHTML = '<div class="search-loading">Searching...</div>';
        this.open(search);

        // Perform search
        if (config.onSearch) {
            try {
                search.results = await config.onSearch(query);
                this.renderResults(search, query);
            } catch (error) {
                search.dropdown.innerHTML = '<div class="search-error">Search failed</div>';
            }
        }
    },

    /**
     * Handle keyboard navigation
     */
    handleKeydown(search, e) {
        const { results, selectedIndex } = search;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                search.selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
                this.updateSelection(search);
                break;

            case 'ArrowUp':
                e.preventDefault();
                search.selectedIndex = Math.max(selectedIndex - 1, -1);
                this.updateSelection(search);
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    this.selectResult(search, results[selectedIndex]);
                }
                break;

            case 'Escape':
                this.close(search);
                break;
        }
    },

    /**
     * Render results
     */
    renderResults(search, query) {
        const { results, config } = search;

        if (results.length === 0) {
            search.dropdown.innerHTML = `
                <div class="search-empty">
                    <span>No results for "${query}"</span>
                </div>
            `;
            return;
        }

        const limited = results.slice(0, config.maxResults);

        let html = '';

        // Group by category if categories provided
        if (config.categories.length > 0) {
            config.categories.forEach(category => {
                const categoryResults = limited.filter(r => r.category === category);
                if (categoryResults.length > 0) {
                    html += `<div class="search-category">${category}</div>`;
                    html += categoryResults.map((r, i) => this.renderResultItem(r, query, config)).join('');
                }
            });
        } else {
            html = limited.map((r, i) => this.renderResultItem(r, query, config)).join('');
        }

        search.dropdown.innerHTML = html;

        // Add click handlers
        search.dropdown.querySelectorAll('.search-result').forEach((el, i) => {
            el.addEventListener('click', () => {
                this.selectResult(search, limited[i]);
            });
        });

        search.selectedIndex = -1;
    },

    /**
     * Render single result item
     */
    renderResultItem(result, query, config) {
        const title = config.highlightMatches
            ? this.highlightText(result.title || result.name, query)
            : (result.title || result.name);

        const description = result.description || result.subtitle || '';

        return `
            <div class="search-result" data-id="${result.id}">
                ${result.icon ? `<span class="search-result-icon">${result.icon}</span>` : ''}
                <div class="search-result-content">
                    <div class="search-result-title">${title}</div>
                    ${description ? `<div class="search-result-description">${description}</div>` : ''}
                </div>
                ${result.badge ? `<span class="search-result-badge">${result.badge}</span>` : ''}
            </div>
        `;
    },

    /**
     * Highlight matching text
     */
    highlightText(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    /**
     * Update selection
     */
    updateSelection(search) {
        const items = search.dropdown.querySelectorAll('.search-result');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === search.selectedIndex);
        });

        // Scroll into view
        if (search.selectedIndex >= 0 && items[search.selectedIndex]) {
            items[search.selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    },

    /**
     * Select result
     */
    selectResult(search, result) {
        const { input, config } = search;

        input.value = result.title || result.name;
        this.close(search);

        // Save to recent
        if (config.showRecent) {
            this.addToRecent(result);
        }

        if (config.onSelect) {
            config.onSelect(result);
        }
    },

    /**
     * Show recent searches
     */
    showRecent(search) {
        const recent = this.getRecent();

        if (recent.length === 0) {
            search.dropdown.innerHTML = '';
            return;
        }

        search.dropdown.innerHTML = `
            <div class="search-header">
                <span>Recent Searches</span>
                <button class="search-clear-recent" onclick="Search.clearRecent()">Clear</button>
            </div>
            ${recent.map(r => `
                <div class="search-result recent" data-id="${r.id}">
                    <span class="search-result-icon">🕐</span>
                    <div class="search-result-content">
                        <div class="search-result-title">${r.title || r.name}</div>
                    </div>
                </div>
            `).join('')}
        `;

        // Add click handlers
        search.dropdown.querySelectorAll('.search-result').forEach((el, i) => {
            el.addEventListener('click', () => {
                this.selectResult(search, recent[i]);
            });
        });

        this.open(search);
    },

    /**
     * Add to recent
     */
    addToRecent(result) {
        const recent = this.getRecent();
        const filtered = recent.filter(r => r.id !== result.id);
        filtered.unshift(result);
        localStorage.setItem('search_recent', JSON.stringify(filtered.slice(0, 5)));
    },

    /**
     * Get recent searches
     */
    getRecent() {
        try {
            return JSON.parse(localStorage.getItem('search_recent')) || [];
        } catch {
            return [];
        }
    },

    /**
     * Clear recent
     */
    clearRecent() {
        localStorage.removeItem('search_recent');
    },

    /**
     * Open dropdown
     */
    open(search) {
        search.dropdown.classList.add('open');
        search.isOpen = true;
    },

    /**
     * Close dropdown
     */
    close(search) {
        search.dropdown.classList.remove('open');
        search.isOpen = false;
        search.selectedIndex = -1;
    }
};

// Styles
const searchStyles = document.createElement('style');
searchStyles.textContent = `
    .search-wrapper {
        position: relative;
    }
    
    .search-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        margin-top: var(--space-1);
        max-height: 400px;
        overflow-y: auto;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s ease;
        z-index: 100;
    }
    
    .search-dropdown.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
    
    .search-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-xs);
        color: var(--text-muted);
        border-bottom: 1px solid var(--border-light);
    }
    
    .search-clear-recent {
        background: none;
        border: none;
        color: var(--color-primary-500);
        cursor: pointer;
        font-size: var(--text-xs);
    }
    
    .search-result {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3);
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .search-result:hover,
    .search-result.selected {
        background: var(--bg-surface);
    }
    
    .search-result-icon {
        font-size: 20px;
    }
    
    .search-result-content {
        flex: 1;
        min-width: 0;
    }
    
    .search-result-title {
        font-weight: var(--font-medium);
    }
    
    .search-result-title mark {
        background: var(--color-primary-100);
        color: var(--color-primary-700);
    }
    
    .search-result-description {
        font-size: var(--text-sm);
        color: var(--text-muted);
    }
    
    .search-result-badge {
        background: var(--bg-muted);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
    }
    
    .search-category {
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        color: var(--text-muted);
        text-transform: uppercase;
        background: var(--bg-surface);
    }
    
    .search-loading,
    .search-empty,
    .search-error {
        padding: var(--space-4);
        text-align: center;
        color: var(--text-muted);
    }
`;

document.head.appendChild(searchStyles);

// Export
window.Search = Search;
