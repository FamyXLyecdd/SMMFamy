/**
 * SMMFamy - Service Filters Component
 * Advanced filtering and search for services | ~400 lines
 */

const ServiceFilters = {
    config: {
        searchDelay: 300,
        minPrice: 0,
        maxPrice: 10000,
        categories: [],
        platforms: []
    },

    state: {
        search: '',
        category: 'all',
        platform: 'all',
        priceRange: [0, 10000],
        quality: 'all',
        sortBy: 'popular',
        inStock: false,
        hasRefill: false
    },

    services: [],
    filteredServices: [],
    container: null,
    onFilter: null,

    /**
     * Initialize service filters
     */
    init(containerId, services, options = {}) {
        this.container = document.getElementById(containerId);
        this.services = services || [];
        this.filteredServices = [...this.services];

        if (options.categories) this.config.categories = options.categories;
        if (options.platforms) this.config.platforms = options.platforms;
        if (options.onFilter) this.onFilter = options.onFilter;
        if (options.maxPrice) {
            this.config.maxPrice = options.maxPrice;
            this.state.priceRange[1] = options.maxPrice;
        }

        // Auto-extract categories and platforms if not provided
        if (this.config.categories.length === 0) {
            this.config.categories = [...new Set(this.services.map(s => s.category))].filter(Boolean);
        }

        if (this.config.platforms.length === 0) {
            this.config.platforms = [...new Set(this.services.map(s => s.platform))].filter(Boolean);
        }

        this.render();
        this.attachEvents();
        this.applyFilters();

        return this;
    },

    /**
     * Render filter controls
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="filters-container">
                <div class="filters-row">
                    <div class="filter-group filter-search">
                        <label class="filter-label">Search Services</label>
                        <div class="search-input-wrapper">
                            <input type="text" class="form-input" id="serviceSearch" 
                                   placeholder="Search by name, ID, or keyword..." 
                                   value="${this.state.search}">
                            <span class="search-icon">🔍</span>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Category</label>
                        <select class="form-select" id="categoryFilter">
                            <option value="all">All Categories</option>
                            ${this.config.categories.map(cat =>
            `<option value="${cat}" ${this.state.category === cat ? 'selected' : ''}>${cat}</option>`
        ).join('')}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Platform</label>
                        <select class="form-select" id="platformFilter">
                            <option value="all">All Platforms</option>
                            ${this.config.platforms.map(platform =>
            `<option value="${platform}" ${this.state.platform === platform ? 'selected' : ''}>${platform}</option>`
        ).join('')}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Sort By</label>
                        <select class="form-select" id="sortFilter">
                            <option value="popular" ${this.state.sortBy === 'popular' ? 'selected' : ''}>Most Popular</option>
                            <option value="price-low" ${this.state.sortBy === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
                            <option value="price-high" ${this.state.sortBy === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
                            <option value="name" ${this.state.sortBy === 'name' ? 'selected' : ''}>Name (A-Z)</option>
                            <option value="newest" ${this.state.sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
                        </select>
                    </div>
                </div>
                
                <div class="filters-row filters-advanced">
                    <div class="filter-group">
                        <label class="filter-label">Quality</label>
                        <div class="filter-buttons" id="qualityFilter">
                            <button class="filter-btn ${this.state.quality === 'all' ? 'active' : ''}" data-value="all">All</button>
                            <button class="filter-btn ${this.state.quality === 'premium' ? 'active' : ''}" data-value="premium">Premium</button>
                            <button class="filter-btn ${this.state.quality === 'standard' ? 'active' : ''}" data-value="standard">Standard</button>
                        </div>
                    </div>
                    
                    <div class="filter-group filter-price-range">
                        <label class="filter-label">Price Range (per 1000)</label>
                        <div class="price-range-inputs">
                            <input type="number" class="form-input" id="priceMin" 
                                   value="${this.state.priceRange[0]}" min="0" placeholder="Min">
                            <span>-</span>
                            <input type="number" class="form-input" id="priceMax" 
                                   value="${this.state.priceRange[1]}" max="${this.config.maxPrice}" placeholder="Max">
                        </div>
                    </div>
                    
                    <div class="filter-group filter-toggles">
                        <label class="filter-checkbox">
                            <input type="checkbox" id="inStockFilter" ${this.state.inStock ? 'checked' : ''}>
                            <span>In Stock Only</span>
                        </label>
                        <label class="filter-checkbox">
                            <input type="checkbox" id="hasRefillFilter" ${this.state.hasRefill ? 'checked' : ''}>
                            <span>Has Refill</span>
                        </label>
                    </div>
                    
                    <div class="filter-group">
                        <button class="btn btn-secondary btn-sm" id="clearFilters">
                            Clear All
                        </button>
                    </div>
                </div>
                
                <div class="filters-info">
                    <span id="resultCount">${this.filteredServices.length} services found</span>
                    <div class="active-filters" id="activeFilters"></div>
                </div>
            </div>
        `;

        this.updateActiveFilters();
    },

    /**
     * Attach event listeners
     */
    attachEvents() {
        // Search with debounce
        const searchInput = document.getElementById('serviceSearch');
        let searchTimeout;
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.state.search = e.target.value;
                this.applyFilters();
            }, this.config.searchDelay);
        });

        // Category filter
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.state.category = e.target.value;
            this.applyFilters();
        });

        // Platform filter
        document.getElementById('platformFilter')?.addEventListener('change', (e) => {
            this.state.platform = e.target.value;
            this.applyFilters();
        });

        // Sort filter
        document.getElementById('sortFilter')?.addEventListener('change', (e) => {
            this.state.sortBy = e.target.value;
            this.applyFilters();
        });

        // Quality filter buttons
        document.getElementById('qualityFilter')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('#qualityFilter .filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.state.quality = e.target.dataset.value;
                this.applyFilters();
            }
        });

        // Price range
        document.getElementById('priceMin')?.addEventListener('change', (e) => {
            this.state.priceRange[0] = parseInt(e.target.value) || 0;
            this.applyFilters();
        });

        document.getElementById('priceMax')?.addEventListener('change', (e) => {
            this.state.priceRange[1] = parseInt(e.target.value) || this.config.maxPrice;
            this.applyFilters();
        });

        // Toggle filters
        document.getElementById('inStockFilter')?.addEventListener('change', (e) => {
            this.state.inStock = e.target.checked;
            this.applyFilters();
        });

        document.getElementById('hasRefillFilter')?.addEventListener('change', (e) => {
            this.state.hasRefill = e.target.checked;
            this.applyFilters();
        });

        // Clear all filters
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });
    },

    /**
     * Apply all filters
     */
    applyFilters() {
        let filtered = [...this.services];

        // Search filter
        if (this.state.search) {
            const searchLower = this.state.search.toLowerCase();
            filtered = filtered.filter(service => {
                return service.name?.toLowerCase().includes(searchLower) ||
                    service.id?.toString().includes(searchLower) ||
                    service.description?.toLowerCase().includes(searchLower) ||
                    service.category?.toLowerCase().includes(searchLower);
            });
        }

        // Category filter
        if (this.state.category !== 'all') {
            filtered = filtered.filter(s => s.category === this.state.category);
        }

        // Platform filter
        if (this.state.platform !== 'all') {
            filtered = filtered.filter(s => s.platform === this.state.platform);
        }

        // Quality filter
        if (this.state.quality !== 'all') {
            filtered = filtered.filter(s => {
                const isPremium = s.quality === 'premium' || s.isPremium || s.rate > 50;
                return this.state.quality === 'premium' ? isPremium : !isPremium;
            });
        }

        // Price range filter
        filtered = filtered.filter(s => {
            const price = s.rate || s.price || 0;
            return price >= this.state.priceRange[0] && price <= this.state.priceRange[1];
        });

        // In stock filter
        if (this.state.inStock) {
            filtered = filtered.filter(s => s.inStock !== false && s.status !== 'offline');
        }

        // Has refill filter
        if (this.state.hasRefill) {
            filtered = filtered.filter(s => s.refill || s.hasRefill);
        }

        // Sort
        filtered = this.sortServices(filtered);

        this.filteredServices = filtered;
        this.updateResultCount();
        this.updateActiveFilters();

        if (this.onFilter) {
            this.onFilter(this.filteredServices, this.state);
        }

        return this.filteredServices;
    },

    /**
     * Sort services
     */
    sortServices(services) {
        const sorted = [...services];

        switch (this.state.sortBy) {
            case 'price-low':
                sorted.sort((a, b) => (a.rate || 0) - (b.rate || 0));
                break;
            case 'price-high':
                sorted.sort((a, b) => (b.rate || 0) - (a.rate || 0));
                break;
            case 'name':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'newest':
                sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                break;
            case 'popular':
            default:
                sorted.sort((a, b) => (b.orders || 0) - (a.orders || 0));
                break;
        }

        return sorted;
    },

    /**
     * Update result count display
     */
    updateResultCount() {
        const countEl = document.getElementById('resultCount');
        if (countEl) {
            countEl.textContent = `${this.filteredServices.length} service${this.filteredServices.length !== 1 ? 's' : ''} found`;
        }
    },

    /**
     * Update active filters display
     */
    updateActiveFilters() {
        const container = document.getElementById('activeFilters');
        if (!container) return;

        const filters = [];

        if (this.state.search) {
            filters.push({ key: 'search', label: `Search: "${this.state.search}"` });
        }
        if (this.state.category !== 'all') {
            filters.push({ key: 'category', label: this.state.category });
        }
        if (this.state.platform !== 'all') {
            filters.push({ key: 'platform', label: this.state.platform });
        }
        if (this.state.quality !== 'all') {
            filters.push({ key: 'quality', label: this.state.quality });
        }
        if (this.state.inStock) {
            filters.push({ key: 'inStock', label: 'In Stock' });
        }
        if (this.state.hasRefill) {
            filters.push({ key: 'hasRefill', label: 'Has Refill' });
        }

        container.innerHTML = filters.map(f => `
            <span class="active-filter-tag">
                ${f.label}
                <button class="remove-filter" data-filter="${f.key}">×</button>
            </span>
        `).join('');

        // Attach remove handlers
        container.querySelectorAll('.remove-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.dataset.filter;
                this.removeFilter(key);
            });
        });
    },

    /**
     * Remove a specific filter
     */
    removeFilter(key) {
        switch (key) {
            case 'search':
                this.state.search = '';
                document.getElementById('serviceSearch').value = '';
                break;
            case 'category':
                this.state.category = 'all';
                document.getElementById('categoryFilter').value = 'all';
                break;
            case 'platform':
                this.state.platform = 'all';
                document.getElementById('platformFilter').value = 'all';
                break;
            case 'quality':
                this.state.quality = 'all';
                document.querySelectorAll('#qualityFilter .filter-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === 'all');
                });
                break;
            case 'inStock':
                this.state.inStock = false;
                document.getElementById('inStockFilter').checked = false;
                break;
            case 'hasRefill':
                this.state.hasRefill = false;
                document.getElementById('hasRefillFilter').checked = false;
                break;
        }

        this.applyFilters();
    },

    /**
     * Clear all filters
     */
    clearFilters() {
        this.state = {
            search: '',
            category: 'all',
            platform: 'all',
            priceRange: [0, this.config.maxPrice],
            quality: 'all',
            sortBy: 'popular',
            inStock: false,
            hasRefill: false
        };

        this.render();
        this.attachEvents();
        this.applyFilters();
    },

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    },

    /**
     * Get filtered services
     */
    getFilteredServices() {
        return this.filteredServices;
    }
};

// Filter styles
const filterStyles = document.createElement('style');
filterStyles.textContent = `
    .filters-container {
        background: var(--bg-card);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        margin-bottom: var(--space-6);
        border: 1px solid var(--border-default);
    }
    
    .filters-row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-4);
        margin-bottom: var(--space-4);
    }
    
    .filters-row:last-child {
        margin-bottom: 0;
    }
    
    .filter-group {
        flex: 1;
        min-width: 160px;
    }
    
    .filter-search {
        flex: 2;
        min-width: 280px;
    }
    
    .filter-label {
        display: block;
        font-size: var(--text-sm);
        font-weight: var(--font-medium);
        margin-bottom: var(--space-2);
        color: var(--text-secondary);
    }
    
    .search-input-wrapper {
        position: relative;
    }
    
    .search-input-wrapper input {
        padding-right: var(--space-8);
    }
    
    .search-icon {
        position: absolute;
        right: var(--space-3);
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
    }
    
    .filter-buttons {
        display: flex;
        gap: var(--space-1);
    }
    
    .filter-btn {
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--border-default);
        background: var(--bg-surface);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .filter-btn:hover {
        border-color: var(--color-primary-300);
    }
    
    .filter-btn.active {
        background: var(--color-primary-500);
        color: white;
        border-color: var(--color-primary-500);
    }
    
    .price-range-inputs {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }
    
    .price-range-inputs input {
        width: 100px;
    }
    
    .filter-toggles {
        display: flex;
        gap: var(--space-4);
        align-items: flex-end;
    }
    
    .filter-checkbox {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
        font-size: var(--text-sm);
    }
    
    .filters-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: var(--space-3);
        border-top: 1px solid var(--border-default);
    }
    
    #resultCount {
        color: var(--text-muted);
        font-size: var(--text-sm);
    }
    
    .active-filters {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }
    
    .active-filter-tag {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-1) var(--space-2);
        background: var(--color-primary-100);
        color: var(--color-primary-700);
        border-radius: var(--radius-full);
        font-size: var(--text-xs);
    }
    
    .remove-filter {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        color: inherit;
        opacity: 0.7;
    }
    
    .remove-filter:hover {
        opacity: 1;
    }
    
    @media (max-width: 768px) {
        .filter-group {
            min-width: 100%;
        }
        
        .filters-advanced {
            display: none;
        }
        
        .filters-advanced.show {
            display: flex;
        }
    }
`;

document.head.appendChild(filterStyles);

// Export for use
window.ServiceFilters = ServiceFilters;
