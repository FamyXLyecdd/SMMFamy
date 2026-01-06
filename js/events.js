/**
 * SMMFamy - Event System
 * Custom event handling and pub/sub | ~200 lines
 */

const Events = {
    listeners: {},

    /**
     * Subscribe to an event
     */
    on(event, callback, options = {}) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0
        };

        this.listeners[event].push(listener);

        // Sort by priority
        this.listeners[event].sort((a, b) => b.priority - a.priority);

        // Return unsubscribe function
        return () => this.off(event, callback);
    },

    /**
     * Subscribe once
     */
    once(event, callback) {
        return this.on(event, callback, { once: true });
    },

    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
        if (!this.listeners[event]) return;

        if (callback) {
            this.listeners[event] = this.listeners[event].filter(
                listener => listener.callback !== callback
            );
        } else {
            delete this.listeners[event];
        }
    },

    /**
     * Emit an event
     */
    emit(event, data = null) {
        if (!this.listeners[event]) return;

        const toRemove = [];

        this.listeners[event].forEach((listener, index) => {
            try {
                listener.callback(data);
            } catch (error) {
                console.error(`Event handler error for ${event}:`, error);
            }

            if (listener.once) {
                toRemove.push(index);
            }
        });

        // Remove once listeners
        toRemove.reverse().forEach(index => {
            this.listeners[event].splice(index, 1);
        });
    },

    /**
     * Check if event has listeners
     */
    hasListeners(event) {
        return this.listeners[event] && this.listeners[event].length > 0;
    },

    /**
     * Get listener count
     */
    listenerCount(event) {
        return this.listeners[event]?.length || 0;
    },

    /**
     * Clear all listeners
     */
    clear(event = null) {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    },

    /**
     * Create namespaced events
     */
    namespace(name) {
        return {
            on: (event, callback, options) => this.on(`${name}:${event}`, callback, options),
            once: (event, callback) => this.once(`${name}:${event}`, callback),
            off: (event, callback) => this.off(`${name}:${event}`, callback),
            emit: (event, data) => this.emit(`${name}:${event}`, data),
            clear: () => {
                Object.keys(this.listeners).forEach(key => {
                    if (key.startsWith(`${name}:`)) {
                        delete this.listeners[key];
                    }
                });
            }
        };
    }
};

// Common events
Events.EVENTS = {
    // Auth events
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_REGISTER: 'auth:register',

    // Order events
    ORDER_CREATED: 'order:created',
    ORDER_UPDATED: 'order:updated',
    ORDER_COMPLETED: 'order:completed',
    ORDER_CANCELLED: 'order:cancelled',

    // Payment events
    PAYMENT_PENDING: 'payment:pending',
    PAYMENT_COMPLETED: 'payment:completed',
    PAYMENT_FAILED: 'payment:failed',

    // Balance events
    BALANCE_UPDATED: 'balance:updated',

    // UI events
    THEME_CHANGED: 'theme:changed',
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',
    TOAST_SHOWN: 'toast:shown',

    // App events
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',
    OFFLINE: 'app:offline',
    ONLINE: 'app:online'
};

// Export
window.Events = Events;
