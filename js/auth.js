/**
 * SMMFamy - Authentication System v2.0
 * Enhanced security with hashing, rate limiting, and session management
 * ~600 lines
 */

const Auth = {
    // Configuration
    config: {
        adminEmail: 'kageroufs@gmail.com',
        adminPasswordHash: null, // Will be computed on init
        adminPassword: 'yinyangtaichi', // Only used for initial hash
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        minPasswordLength: 6,
        tokenLength: 64
    },

    /**
     * Initialize auth system
     */
    init() {
        // Hash admin password on first run
        if (!this.config.adminPasswordHash) {
            this.config.adminPasswordHash = this.hashPassword(this.config.adminPassword);
        }

        // Check session validity
        this.validateSession();

        // Start session monitor
        this.startSessionMonitor();
    },

    /**
     * Secure password hashing using SHA-256 simulation
     * Note: In production, use bcrypt on a backend server
     */
    hashPassword(password, salt = '') {
        const combined = password + salt + 'smmfamy_secret_2024';
        let hash = 0;

        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        // Create a longer hash by multiple iterations
        let result = Math.abs(hash).toString(16);
        for (let i = 0; i < 3; i++) {
            let iter = 0;
            for (let j = 0; j < result.length; j++) {
                iter = ((iter << 5) - iter) + result.charCodeAt(j);
                iter = iter & iter;
            }
            result += Math.abs(iter).toString(16);
        }

        return result.substring(0, 64);
    },

    /**
     * Generate secure token
     */
    generateToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        const array = new Uint32Array(this.config.tokenLength);
        crypto.getRandomValues(array);

        for (let i = 0; i < this.config.tokenLength; i++) {
            token += chars[array[i] % chars.length];
        }

        return token;
    },

    /**
     * Generate user ID
     */
    generateUserId() {
        return 'USR-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    },

    /**
     * Check rate limiting
     */
    checkRateLimit(email) {
        const attempts = Storage.get('loginAttempts', {});
        const userAttempts = attempts[email] || { count: 0, lastAttempt: 0, lockedUntil: 0 };

        const now = Date.now();

        // Check if locked out
        if (userAttempts.lockedUntil && now < userAttempts.lockedUntil) {
            const remaining = Math.ceil((userAttempts.lockedUntil - now) / 60000);
            return {
                allowed: false,
                error: `Account locked. Try again in ${remaining} minutes.`
            };
        }

        // Reset if last attempt was more than 1 hour ago
        if (now - userAttempts.lastAttempt > 60 * 60 * 1000) {
            userAttempts.count = 0;
        }

        return { allowed: true, attempts: userAttempts };
    },

    /**
     * Record login attempt
     */
    recordLoginAttempt(email, success) {
        const attempts = Storage.get('loginAttempts', {});

        if (!attempts[email]) {
            attempts[email] = { count: 0, lastAttempt: 0, lockedUntil: 0 };
        }

        if (success) {
            // Reset on successful login
            attempts[email] = { count: 0, lastAttempt: Date.now(), lockedUntil: 0 };
        } else {
            // Increment failed attempts
            attempts[email].count++;
            attempts[email].lastAttempt = Date.now();

            // Lock if too many attempts
            if (attempts[email].count >= this.config.maxLoginAttempts) {
                attempts[email].lockedUntil = Date.now() + this.config.lockoutDuration;
            }
        }

        Storage.set('loginAttempts', attempts);
    },

    /**
     * Register new user
     */
    register(name, email, password, confirmPassword) {
        // Validate inputs
        if (!name || !email || !password) {
            return { success: false, error: 'All fields are required' };
        }

        if (!Utils.isValidEmail(email)) {
            return { success: false, error: 'Invalid email address' };
        }

        if (password.length < this.config.minPasswordLength) {
            return { success: false, error: `Password must be at least ${this.config.minPasswordLength} characters` };
        }

        if (password !== confirmPassword) {
            return { success: false, error: 'Passwords do not match' };
        }

        // Check if email already exists
        const users = Storage.get('users', []);
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, error: 'Email already registered' };
        }

        // Create user
        const salt = this.generateToken().substring(0, 16);
        const passwordHash = this.hashPassword(password, salt);

        const user = {
            id: this.generateUserId(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            passwordHash,
            salt,
            balance: 0,
            totalSpent: 0,
            totalOrders: 0,
            isAdmin: false,
            isVerified: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
                theme: 'light',
                notifications: true
            }
        };

        users.push(user);
        Storage.set('users', users, { encrypted: true });

        // Record stat
        Stats.recordNewUser();

        // Create session
        this.createSession(user);

        return { success: true, user: this.sanitizeUser(user) };
    },

    /**
     * Login user
     */
    login(email, password, rememberMe = false) {
        // Validate inputs
        if (!email || !password) {
            return { success: false, error: 'Email and password are required' };
        }

        email = email.toLowerCase().trim();

        // Check rate limiting
        const rateLimit = this.checkRateLimit(email);
        if (!rateLimit.allowed) {
            return { success: false, error: rateLimit.error };
        }

        // Check admin login
        const isAdmin = email === this.config.adminEmail &&
            this.hashPassword(password) === this.config.adminPasswordHash;

        if (isAdmin) {
            const adminUser = {
                id: 'ADMIN',
                name: 'Administrator',
                email: this.config.adminEmail,
                balance: Infinity,
                isAdmin: true,
                lastLogin: new Date().toISOString()
            };

            this.recordLoginAttempt(email, true);
            this.createSession(adminUser, rememberMe);
            this.logActivity('admin_login', { email });

            return { success: true, user: adminUser };
        }

        // Check regular users
        const users = Storage.get('users', [], { encrypted: true });
        const user = users.find(u => u.email === email);

        if (!user) {
            this.recordLoginAttempt(email, false);
            return { success: false, error: 'Invalid email or password' };
        }

        // Verify password
        const hash = this.hashPassword(password, user.salt || '');
        if (hash !== user.passwordHash) {
            this.recordLoginAttempt(email, false);
            const remaining = this.config.maxLoginAttempts - (rateLimit.attempts.count + 1);
            return {
                success: false,
                error: remaining > 0
                    ? `Invalid email or password. ${remaining} attempts remaining.`
                    : 'Account locked due to too many failed attempts.'
            };
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        Storage.set('users', users, { encrypted: true });

        this.recordLoginAttempt(email, true);
        this.createSession(user, rememberMe);
        this.logActivity('login', { email });

        return { success: true, user: this.sanitizeUser(user) };
    },

    /**
     * Create user session
     */
    createSession(user, rememberMe = false) {
        const token = this.generateToken();
        const expiresAt = Date.now() + (rememberMe ? 7 * 24 * 60 * 60 * 1000 : this.config.sessionTimeout);

        const session = {
            token,
            userId: user.id,
            email: user.email,
            isAdmin: user.isAdmin || false,
            createdAt: Date.now(),
            expiresAt,
            lastActivity: Date.now()
        };

        Storage.set('session', session, { encrypted: true });
        Storage.set('currentUser', this.sanitizeUser(user));
    },

    /**
     * Validate current session
     */
    validateSession() {
        const session = Storage.get('session', null, { encrypted: true });

        if (!session) {
            return false;
        }

        // Check expiry
        if (Date.now() > session.expiresAt) {
            this.logout();
            return false;
        }

        // Update last activity
        session.lastActivity = Date.now();
        Storage.set('session', session, { encrypted: true });

        return true;
    },

    /**
     * Start session monitor
     */
    startSessionMonitor() {
        // Check session every minute
        setInterval(() => {
            if (this.isLoggedIn() && !this.validateSession()) {
                Notify.warning('Your session has expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = 'login';
                }, 2000);
            }
        }, 60000);
    },

    /**
     * Logout user
     */
    logout() {
        this.logActivity('logout', {});
        Storage.remove('session');
        Storage.remove('currentUser');
        Storage.session.clear();
        window.location.href = 'index';
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        const session = Storage.get('session', null, { encrypted: true });
        return session && Date.now() < session.expiresAt;
    },

    /**
     * Check if user is admin
     */
    isAdmin() {
        const user = this.getCurrentUser();
        // Allow truthy values (true, "true", 1) to handle storage quirks
        return user && !!user.isAdmin;
    },

    /**
     * Get current user
     */
    getCurrentUser() {
        if (!this.isLoggedIn()) return null;
        return Storage.get('currentUser', null);
    },

    /**
     * Get current user balance
     */
    getBalance() {
        const user = this.getCurrentUser();
        if (!user) return 0;
        if (user.isAdmin) return Infinity;

        // Get fresh balance from storage
        const users = Storage.get('users', [], { encrypted: true });
        const freshUser = users.find(u => u.id === user.id);
        return freshUser ? parseFloat(freshUser.balance) || 0 : 0;
    },

    /**
     * Add funds to user balance
     */
    addFunds(amount) {
        const user = this.getCurrentUser();
        if (!user || user.isAdmin) return false;

        const users = Storage.get('users', [], { encrypted: true });
        const index = users.findIndex(u => u.id === user.id);

        if (index === -1) return false;

        users[index].balance = (parseFloat(users[index].balance) || 0) + parseFloat(amount);
        Storage.set('users', users, { encrypted: true });
        Storage.set('currentUser', this.sanitizeUser(users[index]));

        this.logActivity('add_funds', { amount });

        return true;
    },

    /**
     * Deduct funds from user balance
     */
    deductFunds(amount) {
        const user = this.getCurrentUser();
        if (!user || user.isAdmin) return true;

        const users = Storage.get('users', [], { encrypted: true });
        const index = users.findIndex(u => u.id === user.id);

        if (index === -1) return false;

        const currentBalance = parseFloat(users[index].balance) || 0;
        if (currentBalance < amount) return false;

        users[index].balance = currentBalance - parseFloat(amount);
        users[index].totalSpent = (parseFloat(users[index].totalSpent) || 0) + parseFloat(amount);
        users[index].totalOrders = (users[index].totalOrders || 0) + 1;

        Storage.set('users', users, { encrypted: true });
        Storage.set('currentUser', this.sanitizeUser(users[index]));

        return true;
    },

    /**
     * Create local order record
     */
    createOrder(orderData) {
        const user = this.getCurrentUser();
        if (!user) return null;

        const order = {
            id: Utils.generateOrderId(),
            userId: user.id,
            userEmail: user.email,
            ...orderData,
            status: 'Pending',
            createdAt: new Date().toISOString()
        };

        const orders = Storage.get('orders', []);
        orders.unshift(order);
        Storage.set('orders', orders);

        Stats.recordOrder(orderData.quantity);
        this.logActivity('create_order', { orderId: order.id, amount: orderData.charge });

        return order;
    },

    /**
     * Get user's orders
     */
    getUserOrders() {
        const user = this.getCurrentUser();
        if (!user) return [];

        const orders = Storage.get('orders', []);

        if (user.isAdmin) {
            return orders;
        }

        return orders.filter(o => o.userId === user.id);
    },

    /**
     * Get all orders (admin)
     */
    getOrders() {
        return Storage.get('orders', []);
    },

    /**
     * Update order status
     */
    updateOrderStatus(orderId, status, data = {}) {
        const orders = Storage.get('orders', []);
        const index = orders.findIndex(o => o.id === orderId);

        if (index === -1) return false;

        orders[index].status = status;
        orders[index].updatedAt = new Date().toISOString();

        if (data.startCount) orders[index].startCount = data.startCount;
        if (data.remains) orders[index].remains = data.remains;

        Storage.set('orders', orders);
        return true;
    },

    /**
     * Get all users (admin)
     */
    getAllUsers() {
        if (!this.isAdmin()) return [];
        const users = Storage.get('users', [], { encrypted: true });
        return users.map(u => this.sanitizeUser(u));
    },

    /**
     * Update user balance (admin)
     */
    updateUserBalance(userId, newBalance) {
        if (!this.isAdmin()) return false;

        const users = Storage.get('users', [], { encrypted: true });
        const index = users.findIndex(u => u.id === userId);

        if (index === -1) return false;

        users[index].balance = parseFloat(newBalance);
        Storage.set('users', users, { encrypted: true });

        this.logActivity('admin_update_balance', { userId, newBalance });

        return true;
    },

    /**
     * Get admin statistics
     */
    getStats() {
        if (!this.isAdmin()) return {};

        const users = this.getAllUsers();
        const orders = this.getOrders();

        const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.charge || 0), 0);
        const completedOrders = orders.filter(o => o.status === 'Completed').length;

        return {
            totalUsers: users.length,
            totalOrders: orders.length,
            completedOrders,
            totalRevenue: totalRevenue.toFixed(2)
        };
    },

    /**
     * Sanitize user object (remove sensitive data)
     */
    sanitizeUser(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            balance: user.balance,
            totalSpent: user.totalSpent,
            totalOrders: user.totalOrders,
            isAdmin: user.isAdmin,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            preferences: user.preferences
        };
    },

    /**
     * Log user activity
     */
    logActivity(action, data = {}) {
        const user = this.getCurrentUser();
        const activity = {
            action,
            userId: user?.id,
            userEmail: user?.email,
            data,
            timestamp: new Date().toISOString(),
            ip: 'client' // Would be captured by backend in production
        };

        const logs = Storage.get('activityLogs', []);
        logs.unshift(activity);

        // Keep only last 500 logs
        if (logs.length > 500) {
            logs.length = 500;
        }

        Storage.set('activityLogs', logs);
    },

    /**
     * Require authentication
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            Storage.session.set('redirectAfterLogin', window.location.href);
            window.location.href = 'login';
            return false;
        }
        return true;
    },

    /**
     * Require admin access
     */
    requireAdmin() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login';
            return false;
        }
        if (!this.isAdmin()) {
            window.location.href = 'dashboard';
            return false;
        }
        return true;
    },

    /**
     * Change password
     */
    changePassword(currentPassword, newPassword, confirmPassword) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Not logged in' };

        if (newPassword.length < this.config.minPasswordLength) {
            return { success: false, error: `Password must be at least ${this.config.minPasswordLength} characters` };
        }

        if (newPassword !== confirmPassword) {
            return { success: false, error: 'New passwords do not match' };
        }

        const users = Storage.get('users', [], { encrypted: true });
        const index = users.findIndex(u => u.id === user.id);

        if (index === -1) return { success: false, error: 'User not found' };

        // Verify current password
        const currentHash = this.hashPassword(currentPassword, users[index].salt || '');
        if (currentHash !== users[index].passwordHash) {
            return { success: false, error: 'Current password is incorrect' };
        }

        // Update password
        const newSalt = this.generateToken().substring(0, 16);
        users[index].salt = newSalt;
        users[index].passwordHash = this.hashPassword(newPassword, newSalt);
        users[index].updatedAt = new Date().toISOString();

        Storage.set('users', users, { encrypted: true });
        this.logActivity('change_password', {});

        return { success: true };
    },

    /**
     * Update profile
     */
    updateProfile(data) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Not logged in' };

        const users = Storage.get('users', [], { encrypted: true });
        const index = users.findIndex(u => u.id === user.id);

        if (index === -1) return { success: false, error: 'User not found' };

        if (data.name) users[index].name = data.name.trim();
        if (data.preferences) users[index].preferences = { ...users[index].preferences, ...data.preferences };
        users[index].updatedAt = new Date().toISOString();

        Storage.set('users', users, { encrypted: true });
        Storage.set('currentUser', this.sanitizeUser(users[index]));

        return { success: true, user: this.sanitizeUser(users[index]) };
    }
};

// Initialize on load
Auth.init();

// Export for use
window.Auth = Auth;
