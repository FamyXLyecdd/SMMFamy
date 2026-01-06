/**
 * SMMFamy - Router Module
 * Client-side routing | ~300 lines
 */

const Router = {
    routes: {},
    currentRoute: null,
    previousRoute: null,
    basePath: '',
    mode: 'hash', // 'hash' or 'history'
    container: null,

    /**
     * Initialize router
     */
    init(options = {}) {
        this.mode = options.mode || 'hash';
        this.basePath = options.basePath || '';
        this.container = options.container || document.getElementById('app');

        // Route definitions
        if (options.routes) {
            Object.entries(options.routes).forEach(([path, handler]) => {
                this.add(path, handler);
            });
        }

        // Listen for navigation
        if (this.mode === 'hash') {
            window.addEventListener('hashchange', () => this.handleRoute());
        } else {
            window.addEventListener('popstate', () => this.handleRoute());
        }

        // Handle link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                this.navigate(link.dataset.route);
            }
        });

        // Initial route
        this.handleRoute();
    },

    /**
     * Add route
     */
    add(path, handler) {
        // Convert path params to regex
        const paramNames = [];
        const regexPath = path.replace(/:([^/]+)/g, (_, name) => {
            paramNames.push(name);
            return '([^/]+)';
        });

        this.routes[path] = {
            path,
            regex: new RegExp(`^${regexPath}$`),
            paramNames,
            handler
        };

        return this;
    },

    /**
     * Remove route
     */
    remove(path) {
        delete this.routes[path];
        return this;
    },

    /**
     * Navigate to path
     */
    navigate(path, options = {}) {
        const fullPath = this.basePath + path;

        if (this.mode === 'hash') {
            window.location.hash = fullPath;
        } else {
            if (options.replace) {
                history.replaceState({}, '', fullPath);
            } else {
                history.pushState({}, '', fullPath);
            }
            this.handleRoute();
        }

        return this;
    },

    /**
     * Replace current route
     */
    replace(path) {
        return this.navigate(path, { replace: true });
    },

    /**
     * Go back
     */
    back() {
        history.back();
    },

    /**
     * Go forward
     */
    forward() {
        history.forward();
    },

    /**
     * Get current path
     */
    getPath() {
        if (this.mode === 'hash') {
            return window.location.hash.slice(1) || '/';
        }
        return window.location.pathname;
    },

    /**
     * Handle route change
     */
    handleRoute() {
        const path = this.getPath();

        // Find matching route
        let matchedRoute = null;
        let params = {};

        for (const route of Object.values(this.routes)) {
            const match = path.match(route.regex);
            if (match) {
                matchedRoute = route;
                route.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });
                break;
            }
        }

        // Update route state
        this.previousRoute = this.currentRoute;
        this.currentRoute = {
            path,
            params,
            query: this.getQueryParams(),
            route: matchedRoute
        };

        // Dispatch event
        window.dispatchEvent(new CustomEvent('routechange', {
            detail: this.currentRoute
        }));

        // Execute handler
        if (matchedRoute) {
            this.executeHandler(matchedRoute.handler, this.currentRoute);
        } else if (this.routes['*']) {
            // 404 handler
            this.executeHandler(this.routes['*'].handler, this.currentRoute);
        }
    },

    /**
     * Execute route handler
     */
    async executeHandler(handler, route) {
        if (typeof handler === 'function') {
            const result = await handler(route);
            if (typeof result === 'string' && this.container) {
                this.container.innerHTML = result;
            }
        } else if (typeof handler === 'string') {
            // HTML string or URL to fetch
            if (handler.endsWith('.html')) {
                try {
                    const response = await fetch(handler);
                    if (response.ok && this.container) {
                        this.container.innerHTML = await response.text();
                    }
                } catch (error) {
                    console.error('Route handler fetch failed:', error);
                }
            } else if (this.container) {
                this.container.innerHTML = handler;
            }
        }
    },

    /**
     * Get query parameters
     */
    getQueryParams() {
        const params = {};
        const searchString = window.location.search.slice(1) ||
            window.location.hash.split('?')[1] || '';

        searchString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
            }
        });

        return params;
    },

    /**
     * Check if path matches current route
     */
    isActive(path) {
        return this.getPath() === path;
    },

    /**
     * Add route guard
     */
    beforeEach(callback) {
        window.addEventListener('routechange', (e) => {
            callback(e.detail, this.previousRoute);
        });
    },

    /**
     * Create link with data-route attribute
     */
    link(path, text, attributes = {}) {
        const attrs = Object.entries(attributes)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');

        return `<a href="${this.mode === 'hash' ? '#' : ''}${path}" data-route="${path}" ${attrs}>${text}</a>`;
    }
};

// Export
window.Router = Router;
