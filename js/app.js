/**
 * SMMFamy - Main Application Controller
 * Central app logic, navigation, and page controllers
 * ~800 lines
 */

const App = {
    // Current page state
    currentPage: null,
    services: [],

    /**
     * Initialize the application
     */
    async init() {
        // Load services
        await this.loadServices();

        // Update navigation
        this.updateNavigation();

        // Initialize current page
        this.initCurrentPage();

        // Global event listeners
        this.initGlobalEvents();

        console.log('SMMFamy App initialized');
    },

    /**
     * Load services from API
     */
    async loadServices() {
        try {
            this.services = await SMMApi.getServices();
            Storage.session.set('services', this.services);
        } catch (error) {
            console.error('Failed to load services:', error);
            // Try to use cached services
            this.services = Storage.session.get('services', []);
        }
    },

    /**
     * Get services by category
     */
    getServicesByCategory(category) {
        if (!category || category === 'all') {
            return this.services;
        }
        return this.services.filter(s =>
            s.category.toLowerCase().includes(category.toLowerCase())
        );
    },

    /**
     * Get unique categories
     */
    getCategories() {
        const categories = new Map();

        this.services.forEach(service => {
            const cat = service.category;
            if (categories.has(cat)) {
                categories.set(cat, categories.get(cat) + 1);
            } else {
                categories.set(cat, 1);
            }
        });

        return Array.from(categories.entries()).map(([name, count]) => ({
            name,
            count,
            platform: this.getPlatformFromCategory(name)
        }));
    },

    /**
     * Get platform from category name
     */
    getPlatformFromCategory(category) {
        const cat = category.toLowerCase();
        if (cat.includes('instagram')) return 'Instagram';
        if (cat.includes('tiktok')) return 'TikTok';
        if (cat.includes('youtube')) return 'YouTube';
        if (cat.includes('facebook')) return 'Facebook';
        if (cat.includes('twitter')) return 'Twitter';
        if (cat.includes('telegram')) return 'Telegram';
        if (cat.includes('spotify')) return 'Spotify';
        if (cat.includes('discord')) return 'Discord';
        return 'Other';
    },

    /**
     * Update navigation based on auth state
     */
    updateNavigation() {
        const isLoggedIn = Auth.isLoggedIn();
        const user = Auth.getCurrentUser();
        const navActions = document.getElementById('navActions');

        if (!navActions) return;

        if (isLoggedIn && user) {
            const balance = Auth.getBalance();
            const displayBalance = balance === Infinity ? 'Admin' : SMMApi.formatPrice(balance);

            navActions.innerHTML = `
                <a href="funds" class="nav-balance">
                    <span>₱</span>
                    <span>${balance === Infinity ? '∞' : Utils.formatNumber(balance, 2)}</span>
                </a>
                <div class="dropdown">
                    <button class="btn btn-ghost nav-user" id="userDropdownBtn">
                        <span class="avatar avatar-sm">${Utils.getInitials(user.name)}</span>
                        <span class="nav-user-name">${user.name.split(' ')[0]}</span>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right" id="userDropdownMenu">
                        <a href="dashboard" class="dropdown-item">Dashboard</a>
                        <a href="orders" class="dropdown-item">My Orders</a>
                        <a href="funds" class="dropdown-item">Add Funds</a>
                        ${user.isAdmin ? '<a href="admin" class="dropdown-item">Admin Panel</a>' : ''}
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item" id="logoutBtn">Logout</a>
                    </div>
                </div>
            `;

            // Dropdown toggle
            const dropdownBtn = document.getElementById('userDropdownBtn');
            const dropdownMenu = document.getElementById('userDropdownMenu');

            if (dropdownBtn && dropdownMenu) {
                dropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.classList.toggle('open');
                });

                document.addEventListener('click', () => {
                    dropdownMenu.classList.remove('open');
                });
            }

            // Logout handler
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    Auth.logout();
                });
            }
        } else {
            navActions.innerHTML = `
                <a href="login" class="btn btn-ghost">Sign In</a>
                <a href="register" class="btn btn-primary">Get Started</a>
            `;
        }

        // Update active nav link
        const currentPath = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    /**
     * Initialize global events
     */
    initGlobalEvents() {
        // Mobile nav toggle
        const navToggle = document.getElementById('navToggle');
        const navLinks = document.getElementById('navLinks');

        if (navToggle && navLinks) {
            navToggle.addEventListener('click', () => {
                navLinks.classList.toggle('open');
            });
        }

        // Close nav on link click (mobile)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks?.classList.remove('open');
            });
        });
    },

    /**
     * Initialize current page
     */
    initCurrentPage() {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        this.currentPage = path.replace('.html', '');

        // Page-specific initialization
        switch (this.currentPage) {
            case 'index':
                this.initHomePage();
                break;
            case 'services':
                this.initServicesPage();
                break;
            case 'orders':
                this.initOrdersPage();
                break;
            case 'dashboard':
                this.initDashboardPage();
                break;
            case 'funds':
                this.initFundsPage();
                break;
        }
    },

    /**
     * Home Page
     */
    initHomePage() {
        // Animate hero stats
        setTimeout(() => {
            Stats.animateHeroStats();
        }, 500);
    },

    /**
     * Services Page
     */
    initServicesPage() {
        // Require auth
        if (!Auth.requireAuth()) return;

        // Render categories
        this.renderCategories();

        // Render services
        this.renderServices();

        // Search handler
        const searchInput = document.getElementById('serviceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.renderServices(null, searchInput.value);
            }, 300));
        }
    },

    /**
     * Render categories sidebar
     */
    renderCategories() {
        const container = document.getElementById('categoryList');
        if (!container) return;

        const categories = this.getCategories();

        // Group by platform
        const platforms = {};
        categories.forEach(cat => {
            const platform = cat.platform;
            if (!platforms[platform]) {
                platforms[platform] = [];
            }
            platforms[platform].push(cat);
        });

        let html = `
            <button class="category-item active" data-category="all">
                <span class="category-icon">All</span>
                <span>All Services</span>
                <span class="category-count">${this.services.length}</span>
            </button>
        `;

        Object.entries(platforms).forEach(([platform, cats]) => {
            const totalCount = cats.reduce((sum, c) => sum + c.count, 0);
            const icon = SMMApi.getPlatformIcon(platform);

            html += `
                <button class="category-item" data-platform="${platform.toLowerCase()}">
                    <span class="category-icon">${icon ? `<img src="${icon}" alt="${platform}">` : platform.substring(0, 2)}</span>
                    <span>${platform}</span>
                    <span class="category-count">${totalCount}</span>
                </button>
            `;
        });

        container.innerHTML = html;

        // Click handlers
        container.querySelectorAll('.category-item').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.category-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const platform = btn.dataset.platform;
                const category = btn.dataset.category;

                this.renderServices(platform || category);
            });
        });
    },

    /**
     * Render services list
     */
    renderServices(filter = 'all', search = '') {
        const container = document.getElementById('servicesList');
        const countEl = document.getElementById('servicesCount');
        if (!container) return;

        let filtered = this.services;

        // Filter by platform/category
        if (filter && filter !== 'all') {
            filtered = filtered.filter(s =>
                s.category.toLowerCase().includes(filter.toLowerCase())
            );
        }

        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(searchLower) ||
                s.category.toLowerCase().includes(searchLower) ||
                s.service.toString().includes(searchLower)
            );
        }

        // Update count
        if (countEl) {
            countEl.textContent = `${filtered.length} services`;
        }

        // Render empty state
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">?</div>
                    <h3 class="empty-state-title">No Services Found</h3>
                    <p class="empty-state-description">Try a different search term or category.</p>
                </div>
            `;
            return;
        }

        // Render services
        container.innerHTML = filtered.map(service => `
            <div class="card service-card card-hover" data-service-id="${service.service}">
                <div class="service-info">
                    <span class="service-id">#${service.service}</span>
                    <h4 class="service-name">${Utils.escapeHtml(service.name)}</h4>
                    <p class="service-desc">${service.description}</p>
                    <div class="service-meta">
                        <span class="service-meta-item">Min: ${Utils.formatNumber(service.min)}</span>
                        <span class="service-meta-item">Max: ${Utils.formatNumber(service.max)}</span>
                        ${service.refill ? '<span class="badge badge-success">Refill</span>' : ''}
                    </div>
                </div>
                <div class="service-price">
                    <div class="service-price-value">${SMMApi.formatPrice(service.rate)}</div>
                    <div class="service-price-unit">per 1000</div>
                </div>
                <button class="btn btn-primary">Order</button>
            </div>
        `).join('');

        // Click handlers
        container.querySelectorAll('.service-card').forEach(card => {
            const btn = card.querySelector('.btn');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const serviceId = card.dataset.serviceId;
                this.showOrderModal(serviceId);
            });
        });
    },

    /**
     * Show order modal
     */
    showOrderModal(serviceId) {
        const service = this.services.find(s => s.service.toString() === serviceId.toString());
        if (!service) return;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop open';

        const modal = document.createElement('div');
        modal.className = 'modal modal-md open';
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">New Order</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="card card-flat" style="margin-bottom: var(--space-4);">
                    <span class="service-id">#${service.service}</span>
                    <h4 class="service-name">${Utils.escapeHtml(service.name)}</h4>
                    <p class="service-desc" style="margin-top: 4px;">${service.description}</p>
                </div>
                
                <form id="orderForm">
                    <div class="form-group">
                        <label class="form-label form-label-required">Link</label>
                        <input type="url" class="form-input" id="orderLink" 
                               placeholder="https://instagram.com/username" required>
                        <div class="form-helper">Enter the full URL of the post/profile</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label form-label-required">Quantity</label>
                        <input type="number" class="form-input" id="orderQuantity" 
                               min="${service.min}" max="${service.max}" 
                               value="${service.min}" required>
                        <div class="form-helper">Min: ${Utils.formatNumber(service.min)} | Max: ${Utils.formatNumber(service.max)}</div>
                    </div>
                    
                    <div class="order-summary">
                        <div class="order-summary-row">
                            <span>Price per 1000</span>
                            <span>${SMMApi.formatPrice(service.rate)}</span>
                        </div>
                        <div class="order-summary-row">
                            <span>Quantity</span>
                            <span id="orderQtyDisplay">${Utils.formatNumber(service.min)}</span>
                        </div>
                        <div class="order-summary-row total">
                            <span>Total</span>
                            <span id="orderTotal">${SMMApi.formatPrice(SMMApi.calculateTotal(service.rate, service.min))}</span>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary btn-cancel">Cancel</button>
                <button class="btn btn-primary btn-submit">Place Order</button>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        // Quantity change handler
        const qtyInput = modal.querySelector('#orderQuantity');
        const qtyDisplay = modal.querySelector('#orderQtyDisplay');
        const totalDisplay = modal.querySelector('#orderTotal');

        qtyInput.addEventListener('input', () => {
            const qty = parseInt(qtyInput.value) || service.min;
            qtyDisplay.textContent = Utils.formatNumber(qty);
            totalDisplay.textContent = SMMApi.formatPrice(SMMApi.calculateTotal(service.rate, qty));
        });

        const close = () => {
            backdrop.remove();
            modal.remove();
        };

        modal.querySelector('.modal-close').addEventListener('click', close);
        modal.querySelector('.btn-cancel').addEventListener('click', close);
        backdrop.addEventListener('click', close);

        // Submit handler
        modal.querySelector('.btn-submit').addEventListener('click', async () => {
            const link = modal.querySelector('#orderLink').value.trim();
            const quantity = parseInt(qtyInput.value);

            // Validate
            if (!link) {
                Notify.error('Please enter a link');
                return;
            }

            if (!Utils.isValidUrl(link)) {
                Notify.error('Please enter a valid URL');
                return;
            }

            if (quantity < service.min || quantity > service.max) {
                Notify.error(`Quantity must be between ${service.min} and ${service.max}`);
                return;
            }

            const total = SMMApi.calculateTotal(service.rate, quantity);
            const balance = Auth.getBalance();
            const isAdmin = Auth.isAdmin();

            console.log('Order Debug:', { balance, isAdmin, total, user: Auth.getCurrentUser() });

            if (!isAdmin && balance < total) {
                Notify.error('Insufficient balance. Please add funds.');
                return;
            }

            // Confirm
            const confirmed = await Notify.confirm(
                `Confirm order for ${Utils.formatNumber(quantity)} ${service.name} for ${SMMApi.formatPrice(total)}?`,
                { title: 'Confirm Order', confirmText: 'Place Order' }
            );

            if (!confirmed) return;

            // Place order
            try {
                const submitBtn = modal.querySelector('.btn-submit');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> Processing...';

                // Deduct balance
                if (!Auth.deductFunds(total)) {
                    throw new Error('Failed to deduct balance');
                }

                // Create order
                const orderData = {
                    service: service.service,
                    serviceName: service.name,
                    link,
                    quantity,
                    charge: total,
                    pricePerK: service.rate
                };

                const order = Auth.createOrder(orderData);

                if (!order) {
                    throw new Error('Failed to create order');
                }

                // Try to submit to API (mock or real)
                try {
                    await SMMApi.createOrder(orderData);
                    order.apiOrderId = order.id;
                } catch (apiError) {
                    console.warn('API order failed, order saved locally:', apiError);
                }

                close();
                Notify.success('Order placed successfully!');

                // Update nav balance
                this.updateNavigation();

            } catch (error) {
                Notify.error(error.message || 'Failed to place order');
            }
        });
    },

    /**
     * Orders Page
     */
    initOrdersPage() {
        if (!Auth.requireAuth()) return;

        this.renderOrders();

        // Refresh button
        const refreshBtn = document.getElementById('refreshOrders');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<span class="spinner spinner-sm"></span> Refreshing...';

                try {
                    // Get active orders
                    const orders = Auth.getUserOrders();
                    const activeOrders = orders.filter(o =>
                        ['Pending', 'In progress', 'Processing'].includes(o.status) ||
                        o.status === 'Partial'
                    );

                    let updatedCount = 0;

                    // Update status for active orders
                    for (const order of activeOrders) {
                        try {
                            if (!order.apiOrderId) continue;

                            const result = await SMMApi.getOrderStatus(order.apiOrderId);

                            if (result && result.status) {
                                // Map API status to local status if needed (SMMGen usually matches)
                                const newStatus = result.status; // e.g., 'Completed', 'Partial', 'Canceled'

                                // Only update if changed or data updated
                                if (order.status !== newStatus || result.remains !== order.remains) {
                                    Auth.updateOrderStatus(order.id, newStatus, {
                                        remains: result.remains,
                                        startCount: result.start_count
                                    });
                                    updatedCount++;
                                }
                            }
                        } catch (err) {
                            console.warn(`Failed to update order ${order.id}:`, err);
                        }

                        // Small delay to avoid rate limits if many orders
                        if (activeOrders.length > 5) await Utils.sleep(200);
                    }

                    this.renderOrders();

                    if (updatedCount > 0) {
                        Notify.success(`Updated ${updatedCount} orders`);
                    } else {
                        Notify.info('Orders are up to date');
                    }
                } catch (error) {
                    console.error('Refresh error:', error);
                    Notify.error('Failed to refresh orders');
                } finally {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = 'Refresh Status';
                }
            });
        }
    },

    /**
     * Render orders table
     */
    renderOrders() {
        const container = document.getElementById('ordersTable');
        if (!container) return;

        const orders = Auth.getUserOrders();

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3 class="empty-state-title">No Orders Yet</h3>
                    <p class="empty-state-description">Your order history will appear here.</p>
                    <a href="services.html" class="btn btn-primary">Browse Services</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Service</th>
                        <th>Link</th>
                        <th>Quantity</th>
                        <th>Charge</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td><code>${order.id}</code></td>
                            <td>${Utils.escapeHtml(Utils.truncate(order.serviceName, 30))}</td>
                            <td><a href="${order.link}" target="_blank">${Utils.truncateUrl(order.link, 25)}</a></td>
                            <td>${Utils.formatNumber(order.quantity)}</td>
                            <td>${SMMApi.formatPrice(order.charge)}</td>
                            <td><span class="status-badge status-${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></td>
                            <td>${Utils.formatRelativeTime(order.createdAt)}</td>
                            <td>
                                ${window.RefillMonitor ? RefillMonitor.renderRefillButton(order) : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * Dashboard Page
     */
    initDashboardPage() {
        if (!Auth.requireAuth()) return;

        this.renderDashboard();
    },

    /**
     * Render dashboard
     */
    renderDashboard() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const balance = Auth.getBalance();
        const orders = Auth.getUserOrders();
        const completedOrders = orders.filter(o => o.status === 'Completed').length;
        const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.charge || 0), 0);

        // Update stat cards
        const updateStat = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        updateStat('statBalance', balance === Infinity ? '∞' : SMMApi.formatPrice(balance));
        updateStat('statOrders', orders.length);
        updateStat('statCompleted', completedOrders);
        updateStat('statSpent', SMMApi.formatPrice(totalSpent));

        // Welcome message
        const welcomeEl = document.getElementById('welcomeMessage');
        if (welcomeEl) {
            welcomeEl.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
        }

        // Recent orders
        const recentContainer = document.getElementById('recentOrders');
        if (recentContainer) {
            const recent = orders.slice(0, 5);

            if (recent.length === 0) {
                recentContainer.innerHTML = `
                    <div class="empty-state" style="padding: var(--space-6);">
                        <p class="text-muted">No orders yet</p>
                        <a href="services.html" class="btn btn-primary btn-sm">Place First Order</a>
                    </div>
                `;
            } else {
                recentContainer.innerHTML = recent.map(order => `
                    <div class="card card-sm card-flat" style="margin-bottom: var(--space-2);">
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="font-semibold">${Utils.truncate(order.serviceName, 25)}</div>
                                <div class="text-sm text-muted">${Utils.formatRelativeTime(order.createdAt)}</div>
                            </div>
                            <span class="status-badge status-${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    },

    /**
     * Funds Page
     */
    initFundsPage() {
        if (!Auth.requireAuth()) return;

        // Update current balance
        const balanceEl = document.getElementById('currentBalance');
        if (balanceEl) {
            const balance = Auth.getBalance();
            balanceEl.textContent = balance === Infinity ? '∞' : SMMApi.formatPrice(balance);
        }

        // Render payment methods
        Payments.renderPaymentMethods('paymentMethods');

        // Render quick amounts
        Payments.renderQuickAmounts('quickAmounts', 'fundAmount');

        // Add funds handler
        const addFundsBtn = document.getElementById('addFundsBtn');
        const amountInput = document.getElementById('fundAmount');

        if (addFundsBtn && amountInput) {
            addFundsBtn.addEventListener('click', () => {
                const amount = parseFloat(amountInput.value);
                const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;

                if (!amount || amount < Payments.config.minDeposit) {
                    Notify.error(`Minimum deposit is ${SMMApi.formatPrice(Payments.config.minDeposit)}`);
                    return;
                }

                if (!method) {
                    Notify.error('Please select a payment method');
                    return;
                }

                const result = Payments.createPaymentRequest(amount, method);

                if (!result.success) {
                    Notify.error(result.error);
                    return;
                }

                Payments.showPaymentInstructions(result.request);
            });
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use
window.App = App;
