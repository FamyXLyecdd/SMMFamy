/**
 * SMMFamy - State Management
 * Simple reactive state store | ~350 lines
 */

const Store = {
    state: {},
    listeners: {},
    history: [],
    maxHistoryLength: 50,

    /**
     * Initialize store with initial state
     */
    init(initialState = {}) {
        this.state = this.deepClone(initialState);
        this.saveToHistory();
    },

    /**
     * Get state value by path
     */
    get(path, defaultValue = undefined) {
        if (!path) return this.deepClone(this.state);

        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value === undefined || value === null) {
                return defaultValue;
            }
            value = value[key];
        }

        return value !== undefined ? this.deepClone(value) : defaultValue;
    },

    /**
     * Set state value by path
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.state;

        for (const key of keys) {
            if (current[key] === undefined || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        const oldValue = current[lastKey];
        current[lastKey] = this.deepClone(value);

        this.saveToHistory();
        this.notify(path, value, oldValue);

        return this;
    },

    /**
     * Update multiple values at once
     */
    update(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            this.set(path, value);
        });

        return this;
    },

    /**
     * Delete state value by path
     */
    delete(path) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.state;

        for (const key of keys) {
            if (!current[key]) return this;
            current = current[key];
        }

        delete current[lastKey];
        this.saveToHistory();
        this.notify(path, undefined);

        return this;
    },

    /**
     * Subscribe to state changes
     */
    subscribe(path, callback) {
        if (!this.listeners[path]) {
            this.listeners[path] = [];
        }

        this.listeners[path].push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners[path] = this.listeners[path].filter(cb => cb !== callback);
        };
    },

    /**
     * Subscribe to any state change
     */
    onAnyChange(callback) {
        return this.subscribe('*', callback);
    },

    /**
     * Notify subscribers of changes
     */
    notify(path, newValue, oldValue) {
        // Notify exact path listeners
        if (this.listeners[path]) {
            this.listeners[path].forEach(callback => {
                callback(newValue, oldValue, path);
            });
        }

        // Notify wildcard listeners
        if (this.listeners['*']) {
            this.listeners['*'].forEach(callback => {
                callback(newValue, oldValue, path);
            });
        }

        // Notify parent path listeners
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.listeners[parentPath]) {
                this.listeners[parentPath].forEach(callback => {
                    callback(this.get(parentPath), undefined, parentPath);
                });
            }
        }
    },

    /**
     * Save current state to history
     */
    saveToHistory() {
        this.history.push(this.deepClone(this.state));

        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }
    },

    /**
     * Undo last change
     */
    undo() {
        if (this.history.length <= 1) return false;

        this.history.pop(); // Remove current state
        this.state = this.deepClone(this.history[this.history.length - 1]);
        this.notify('*', this.state);

        return true;
    },

    /**
     * Reset to initial state
     */
    reset() {
        if (this.history.length > 0) {
            this.state = this.deepClone(this.history[0]);
            this.history = [this.deepClone(this.state)];
            this.notify('*', this.state);
        }
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));

        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    },

    /**
     * Compute derived state
     */
    computed(path, dependencies, computeFn) {
        // Initial computation
        const compute = () => {
            const deps = dependencies.map(dep => this.get(dep));
            return computeFn(...deps);
        };

        this.set(path, compute());

        // Subscribe to dependencies
        dependencies.forEach(dep => {
            this.subscribe(dep, () => {
                this.set(path, compute());
            });
        });
    },

    /**
     * Persist state to localStorage
     */
    persist(storageKey = 'app_state') {
        // Load from storage
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                this.state = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load persisted state:', e);
            }
        }

        // Save on changes
        this.onAnyChange(() => {
            localStorage.setItem(storageKey, JSON.stringify(this.state));
        });
    },

    /**
     * Create a scoped store
     */
    scope(basePath) {
        return {
            get: (path, defaultValue) => this.get(path ? `${basePath}.${path}` : basePath, defaultValue),
            set: (path, value) => this.set(`${basePath}.${path}`, value),
            delete: (path) => this.delete(`${basePath}.${path}`),
            subscribe: (path, callback) => this.subscribe(`${basePath}.${path}`, callback)
        };
    }
};

// Global app store
const AppStore = Object.create(Store);
AppStore.init({
    user: null,
    balance: 0,
    orders: [],
    services: [],
    settings: {
        theme: 'light',
        currency: 'PHP',
        notifications: true
    },
    ui: {
        loading: false,
        sidebarOpen: false,
        activeModal: null
    }
});

// Persist certain paths
if (typeof localStorage !== 'undefined') {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            AppStore.set('user', JSON.parse(savedUser));
        } catch (e) { }
    }

    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        try {
            AppStore.set('settings', JSON.parse(savedSettings));
        } catch (e) { }
    }

    // Auto-save settings
    AppStore.subscribe('settings', (value) => {
        localStorage.setItem('settings', JSON.stringify(value));
    });
}

// Export
window.Store = Store;
window.AppStore = AppStore;
