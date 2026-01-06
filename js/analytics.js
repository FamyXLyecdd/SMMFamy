/**
 * SMMFamy - Analytics Dashboard
 * Charts and analytics for admin dashboard | ~350 lines
 */

const Analytics = {
    /**
     * Get revenue by date range
     */
    getRevenueByRange(days = 30) {
        const orders = Storage.get('orders', []);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const filteredOrders = orders.filter(o =>
            new Date(o.createdAt) >= startDate
        );

        return filteredOrders.reduce((sum, o) =>
            sum + parseFloat(o.charge || 0), 0
        );
    },

    /**
     * Get revenue by day
     */
    getDailyRevenue(days = 7) {
        const orders = Storage.get('orders', []);
        const data = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayOrders = orders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= date && orderDate < nextDate;
            });

            const revenue = dayOrders.reduce((sum, o) =>
                sum + parseFloat(o.charge || 0), 0
            );

            data.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
                revenue,
                orders: dayOrders.length
            });
        }

        return data;
    },

    /**
     * Get orders by status
     */
    getOrdersByStatus() {
        const orders = Storage.get('orders', []);
        const statusCounts = {};

        orders.forEach(order => {
            const status = order.status || 'Pending';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        return Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
            percentage: orders.length > 0 ? Math.round((count / orders.length) * 100) : 0
        }));
    },

    /**
     * Get top services
     */
    getTopServices(limit = 10) {
        const orders = Storage.get('orders', []);
        const serviceCounts = {};

        orders.forEach(order => {
            const name = order.serviceName || 'Unknown';
            if (!serviceCounts[name]) {
                serviceCounts[name] = { count: 0, revenue: 0 };
            }
            serviceCounts[name].count++;
            serviceCounts[name].revenue += parseFloat(order.charge || 0);
        });

        return Object.entries(serviceCounts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    },

    /**
     * Get user growth
     */
    getUserGrowth(days = 30) {
        const users = Storage.get('users', [], { encrypted: true });
        const data = [];
        let cumulative = 0;

        // Get users created before the range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const usersBeforeRange = users.filter(u =>
            new Date(u.createdAt) < startDate
        ).length;
        cumulative = usersBeforeRange;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const newUsers = users.filter(u => {
                const createdDate = new Date(u.createdAt);
                return createdDate >= date && createdDate < nextDate;
            }).length;

            cumulative += newUsers;

            data.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
                newUsers,
                totalUsers: cumulative
            });
        }

        return data;
    },

    /**
     * Get platform distribution
     */
    getPlatformDistribution() {
        const orders = Storage.get('orders', []);
        const platformCounts = {};

        orders.forEach(order => {
            const platform = Utils.getPlatformFromUrl(order.link) || 'Other';
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });

        const total = orders.length;

        return Object.entries(platformCounts)
            .map(([platform, count]) => ({
                platform,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);
    },

    /**
     * Get average order value
     */
    getAverageOrderValue() {
        const orders = Storage.get('orders', []);
        if (orders.length === 0) return 0;

        const total = orders.reduce((sum, o) => sum + parseFloat(o.charge || 0), 0);
        return total / orders.length;
    },

    /**
     * Get hourly order distribution
     */
    getHourlyDistribution() {
        const orders = Storage.get('orders', []);
        const hours = Array(24).fill(0);

        orders.forEach(order => {
            const hour = new Date(order.createdAt).getHours();
            hours[hour]++;
        });

        return hours.map((count, hour) => ({
            hour,
            label: `${hour.toString().padStart(2, '0')}:00`,
            count
        }));
    },

    /**
     * Render simple bar chart (CSS-based)
     */
    renderBarChart(containerId, data, valueKey = 'value', labelKey = 'label') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const maxValue = Math.max(...data.map(d => d[valueKey]));

        container.innerHTML = `
            <div class="chart-bars" style="display: flex; align-items: flex-end; gap: var(--space-2); height: 200px;">
                ${data.map(item => `
                    <div class="chart-bar" style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div class="chart-bar-value" style="font-size: var(--text-xs); margin-bottom: 4px;">
                            ${typeof item[valueKey] === 'number' && item[valueKey] > 1000
                ? Utils.formatCompact(item[valueKey])
                : item[valueKey]}
                        </div>
                        <div class="chart-bar-fill" style="
                            width: 100%;
                            height: ${maxValue > 0 ? (item[valueKey] / maxValue) * 150 : 0}px;
                            background: linear-gradient(180deg, var(--color-primary-400), var(--color-primary-600));
                            border-radius: var(--radius-sm) var(--radius-sm) 0 0;
                            min-height: 4px;
                            transition: height 0.3s ease;
                        "></div>
                        <div class="chart-bar-label" style="font-size: var(--text-xs); margin-top: 4px; text-align: center;">
                            ${item[labelKey]}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render progress bars for status distribution
     */
    renderStatusBars(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const statusData = this.getOrdersByStatus();
        const statusColors = {
            'Pending': 'var(--color-warning-500)',
            'Processing': 'var(--color-info-500)',
            'In progress': 'var(--color-primary-500)',
            'Completed': 'var(--color-success-500)',
            'Partial': 'var(--color-accent-500)',
            'Canceled': 'var(--color-error-500)',
            'Refunded': 'var(--color-gray-500)'
        };

        container.innerHTML = statusData.map(item => `
            <div style="margin-bottom: var(--space-3);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>${item.status}</span>
                    <span>${item.count} (${item.percentage}%)</span>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar" style="
                        width: ${item.percentage}%;
                        background: ${statusColors[item.status] || 'var(--color-gray-500)'};
                    "></div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render platform pie chart (CSS-based)
     */
    renderPlatformChart(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const data = this.getPlatformDistribution();
        const platformColors = {
            'Instagram': '#E4405F',
            'TikTok': '#000000',
            'YouTube': '#FF0000',
            'Facebook': '#1877F2',
            'Twitter': '#1DA1F2',
            'Telegram': '#0088CC',
            'Spotify': '#1DB954',
            'Discord': '#5865F2',
            'Other': '#6B7280'
        };

        container.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-3);">
                ${data.map(item => `
                    <div style="display: flex; align-items: center; gap: var(--space-2);">
                        <div style="
                            width: 12px;
                            height: 12px;
                            border-radius: var(--radius-full);
                            background: ${platformColors[item.platform] || platformColors.Other};
                        "></div>
                        <span style="font-size: var(--text-sm);">${item.platform}</span>
                        <span style="font-size: var(--text-sm); color: var(--text-muted);">${item.percentage}%</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Get summary stats
     */
    getSummaryStats() {
        const orders = Storage.get('orders', []);
        const users = Storage.get('users', [], { encrypted: true });
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.charge || 0), 0);

        return {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + parseFloat(o.charge || 0), 0),
            totalUsers: users.length,
            todayOrders: todayOrders.length,
            todayRevenue,
            averageOrderValue: this.getAverageOrderValue(),
            completionRate: orders.length > 0
                ? Math.round((orders.filter(o => o.status === 'Completed').length / orders.length) * 100)
                : 0
        };
    }
};

// Export for use
window.Analytics = Analytics;
