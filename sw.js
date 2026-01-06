/**
 * SMMFamy - Service Worker
 * Offline support and caching | ~250 lines
 */

const CACHE_NAME = 'smmfamy-v1';
const STATIC_CACHE = 'smmfamy-static-v1';
const DYNAMIC_CACHE = 'smmfamy-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/services.html',
    '/dashboard.html',
    '/orders.html',
    '/funds.html',
    '/login.html',
    '/register.html',
    '/faq.html',
    '/profile.html',
    '/css/styles.css',
    '/css/components.css',
    '/css/pages.css',
    '/css/animations.css',
    '/js/storage.js',
    '/js/utils.js',
    '/js/notifications.js',
    '/js/stats.js',
    '/js/auth.js',
    '/js/api.js',
    '/js/payments.js',
    '/js/app.js',
    '/assets/logo.png'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[Service Worker] Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[Service Worker] Static files cached');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[Service Worker] Cache failed:', err);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');

    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map(key => {
                            console.log('[Service Worker] Removing old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Skip API requests
    if (url.pathname.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                // Return cached response if available
                if (cachedResponse) {
                    // Fetch update in background
                    fetchAndCache(request);
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetchAndCache(request);
            })
            .catch(() => {
                // Fallback for HTML pages
                if (request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            })
    );
});

// Fetch and cache
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);

        // Only cache successful responses
        if (response.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        throw error;
    }
}

// Handle push notifications
self.addEventListener('push', event => {
    console.log('[Service Worker] Push received');

    let data = {
        title: 'SMMFamy',
        body: 'You have a new notification',
        icon: '/assets/logo.png',
        badge: '/assets/logo.png',
        url: '/'
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification clicked');

    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Try to focus existing window
                for (const client of clientList) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Handle background sync
self.addEventListener('sync', event => {
    console.log('[Service Worker] Sync event:', event.tag);

    if (event.tag === 'sync-orders') {
        event.waitUntil(syncOrders());
    }

    if (event.tag === 'sync-payments') {
        event.waitUntil(syncPayments());
    }
});

// Sync pending orders
async function syncOrders() {
    try {
        // Get pending orders from IndexedDB
        const pendingOrders = await getPendingFromDB('orders');

        for (const order of pendingOrders) {
            try {
                const response = await fetch('/api/v2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(order)
                });

                if (response.ok) {
                    await removeFromDB('orders', order.id);
                    console.log('[Service Worker] Order synced:', order.id);
                }
            } catch (err) {
                console.error('[Service Worker] Order sync failed:', err);
            }
        }
    } catch (err) {
        console.error('[Service Worker] Sync orders failed:', err);
    }
}

// Sync pending payments
async function syncPayments() {
    try {
        // Get pending payments from IndexedDB
        const pendingPayments = await getPendingFromDB('payments');

        for (const payment of pendingPayments) {
            try {
                // Notify about pending payment
                await self.registration.showNotification('Payment Pending', {
                    body: `You have a pending payment of ${payment.amount}`,
                    icon: '/assets/logo.png',
                    data: { url: '/funds.html' }
                });
            } catch (err) {
                console.error('[Service Worker] Payment sync failed:', err);
            }
        }
    } catch (err) {
        console.error('[Service Worker] Sync payments failed:', err);
    }
}

// IndexedDB helpers
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('smmfamy-offline', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('orders')) {
                db.createObjectStore('orders', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('payments')) {
                db.createObjectStore('payments', { keyPath: 'id' });
            }
        };
    });
}

async function getPendingFromDB(store) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function removeFromDB(store, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

console.log('[Service Worker] Loaded');
