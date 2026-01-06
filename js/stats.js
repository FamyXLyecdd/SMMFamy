/**
 * SMMFamy - Dynamic Statistics
 * Stats that grow realistically over time | ~250 lines
 */

const Stats = {
    // Base stats (starting point)
    baseStats: {
        totalOrders: 50000,
        ordersDelivered: 48500000,
        activeUsers: 2500,
        satisfactionRate: 99
    },

    // Growth rates per hour
    growthRates: {
        totalOrders: 5,       // 5 new orders per hour on average
        ordersDelivered: 1200, // Items delivered per hour
        activeUsers: 0.5,      // New users per hour
        satisfactionRate: 0    // Static
    },

    // Launch date (for calculating growth)
    launchDate: new Date('2024-01-01').getTime(),

    /**
     * Get current stats with realistic growth
     */
    getStats() {
        const stored = Storage.get('stats', null);
        const now = Date.now();

        if (stored && stored.lastUpdated) {
            // Calculate time-based growth
            const hoursSinceUpdate = (now - stored.lastUpdated) / (1000 * 60 * 60);
            const hoursSinceLaunch = (now - this.launchDate) / (1000 * 60 * 60);

            // Update with growth
            const stats = {
                totalOrders: stored.totalOrders + Math.floor(this.growthRates.totalOrders * hoursSinceUpdate + this.getRandomVariance(10)),
                ordersDelivered: stored.ordersDelivered + Math.floor(this.growthRates.ordersDelivered * hoursSinceUpdate + this.getRandomVariance(100)),
                activeUsers: stored.activeUsers + Math.floor(this.growthRates.activeUsers * hoursSinceUpdate + this.getRandomVariance(1)),
                satisfactionRate: this.baseStats.satisfactionRate,
                lastUpdated: now
            };

            // Save updated stats
            Storage.set('stats', stats);

            return stats;
        }

        // Initialize stats
        const hoursSinceLaunch = (now - this.launchDate) / (1000 * 60 * 60);

        const stats = {
            totalOrders: this.baseStats.totalOrders + Math.floor(this.growthRates.totalOrders * hoursSinceLaunch),
            ordersDelivered: this.baseStats.ordersDelivered + Math.floor(this.growthRates.ordersDelivered * hoursSinceLaunch),
            activeUsers: this.baseStats.activeUsers + Math.floor(this.growthRates.activeUsers * hoursSinceLaunch),
            satisfactionRate: this.baseStats.satisfactionRate,
            lastUpdated: now
        };

        Storage.set('stats', stats);
        return stats;
    },

    /**
     * Add variance for realism
     */
    getRandomVariance(max) {
        return Math.floor(Math.random() * max) - Math.floor(max / 2);
    },

    /**
     * Increment stats when order is placed
     */
    recordOrder(quantity) {
        const stats = this.getStats();
        stats.totalOrders += 1;
        stats.ordersDelivered += parseInt(quantity) || 1;
        stats.lastUpdated = Date.now();
        Storage.set('stats', stats);
    },

    /**
     * Increment users when someone registers
     */
    recordNewUser() {
        const stats = this.getStats();
        stats.activeUsers += 1;
        stats.lastUpdated = Date.now();
        Storage.set('stats', stats);
    },

    /**
     * Get formatted stats for display
     */
    getFormattedStats() {
        const stats = this.getStats();

        return {
            totalOrders: {
                value: stats.totalOrders,
                display: Utils.formatCompact(stats.totalOrders) + '+',
                label: 'Orders Completed'
            },
            ordersDelivered: {
                value: stats.ordersDelivered,
                display: Utils.formatCompact(stats.ordersDelivered) + '+',
                label: 'Items Delivered'
            },
            activeUsers: {
                value: stats.activeUsers,
                display: Utils.formatCompact(stats.activeUsers) + '+',
                label: 'Happy Customers'
            },
            satisfactionRate: {
                value: stats.satisfactionRate,
                display: stats.satisfactionRate + '%',
                label: 'Satisfaction Rate'
            }
        };
    },

    /**
     * Animate stats on hero section
     */
    animateHeroStats() {
        const stats = this.getFormattedStats();

        const elements = {
            totalOrders: document.querySelector('[data-stat="totalOrders"]'),
            ordersDelivered: document.querySelector('[data-stat="ordersDelivered"]'),
            activeUsers: document.querySelector('[data-stat="activeUsers"]'),
            satisfactionRate: document.querySelector('[data-stat="satisfactionRate"]')
        };

        Object.entries(elements).forEach(([key, el]) => {
            if (el && stats[key]) {
                const target = stats[key].value;
                const suffix = key === 'satisfactionRate' ? '%' : '+';

                this.animateNumber(el, target, suffix);
            }
        });
    },

    /**
     * Animate number counting up
     */
    animateNumber(element, target, suffix = '', duration = 2000) {
        const start = 0;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);

            element.textContent = Utils.formatCompact(current) + suffix;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = Utils.formatCompact(target) + suffix;
            }
        };

        requestAnimationFrame(step);
    },

    /**
     * Get real-time admin stats
     */
    getAdminStats() {
        const users = Storage.get('users', [], { encrypted: true });
        const orders = Storage.get('orders', []);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekTimestamp = weekAgo.getTime();

        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthTimestamp = monthAgo.getTime();

        // Calculate stats
        const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.charge || 0), 0);
        const todayRevenue = orders
            .filter(o => new Date(o.createdAt).getTime() >= todayTimestamp)
            .reduce((sum, o) => sum + parseFloat(o.charge || 0), 0);
        const weekRevenue = orders
            .filter(o => new Date(o.createdAt).getTime() >= weekTimestamp)
            .reduce((sum, o) => sum + parseFloat(o.charge || 0), 0);
        const monthRevenue = orders
            .filter(o => new Date(o.createdAt).getTime() >= monthTimestamp)
            .reduce((sum, o) => sum + parseFloat(o.charge || 0), 0);

        const todayOrders = orders.filter(o => new Date(o.createdAt).getTime() >= todayTimestamp).length;
        const weekOrders = orders.filter(o => new Date(o.createdAt).getTime() >= weekTimestamp).length;
        const monthOrders = orders.filter(o => new Date(o.createdAt).getTime() >= monthTimestamp).length;

        const todayUsers = users.filter(u => new Date(u.createdAt).getTime() >= todayTimestamp).length;
        const weekUsers = users.filter(u => new Date(u.createdAt).getTime() >= weekTimestamp).length;
        const monthUsers = users.filter(u => new Date(u.createdAt).getTime() >= monthTimestamp).length;

        const pendingPayments = (Storage.get('pendingPayments', [])).length;
        const openTickets = (Storage.get('tickets', [])).filter(t => t.status === 'open').length;
        const completedOrders = orders.filter(o => o.status === 'Completed').length;

        return {
            revenue: {
                total: totalRevenue,
                today: todayRevenue,
                week: weekRevenue,
                month: monthRevenue
            },
            orders: {
                total: orders.length,
                today: todayOrders,
                week: weekOrders,
                month: monthOrders,
                completed: completedOrders
            },
            users: {
                total: users.length,
                today: todayUsers,
                week: weekUsers,
                month: monthUsers
            },
            pending: {
                payments: pendingPayments,
                tickets: openTickets
            }
        };
    }
};

// Export for use
window.Stats = Stats;
