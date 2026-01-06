/**
 * SMMFamy - Refill Monitor System
 * Track and request refills for orders | ~200 lines
 */

const RefillMonitor = {
    /**
     * Check if order is eligible for refill
     */
    isEligible(order) {
        // Must be completed
        if (order.status !== 'Completed') return false;

        // Must have refill flag
        const service = App.services?.find(s => s.service === order.service);
        if (!service?.refill) return false;

        // Must be within refill period (30 days)
        const orderDate = new Date(order.createdAt);
        const refillDeadline = new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (Date.now() > refillDeadline) return false;

        // Check if already requested refill
        if (order.refillRequested) return false;

        return true;
    },

    /**
     * Request refill for order
     */
    async requestRefill(orderId) {
        const user = Auth.getCurrentUser();
        if (!user) return { success: false, error: 'Not logged in' };

        const orders = Storage.get('orders', []);
        const index = orders.findIndex(o => o.id === orderId);

        if (index === -1) return { success: false, error: 'Order not found' };

        const order = orders[index];

        // Check ownership
        if (order.userId !== user.id && !user.isAdmin) {
            return { success: false, error: 'Access denied' };
        }

        // Check eligibility
        if (!this.isEligible(order)) {
            return { success: false, error: 'Order is not eligible for refill' };
        }

        // Mark as refill requested
        orders[index].refillRequested = true;
        orders[index].refillRequestedAt = new Date().toISOString();
        orders[index].refillStatus = 'Pending';

        Storage.set('orders', orders);

        Auth.logActivity('refill_request', { orderId });

        // Try API refill (mock)
        try {
            await SMMApi.refillOrder(order.apiOrderId || orderId);
            orders[index].refillStatus = 'Processing';
            Storage.set('orders', orders);
        } catch (error) {
            console.warn('API refill failed:', error);
        }

        return { success: true };
    },

    /**
     * Get refill-eligible orders
     */
    getEligibleOrders() {
        const user = Auth.getCurrentUser();
        if (!user) return [];

        const orders = Storage.get('orders', []);
        return orders.filter(o =>
            o.userId === user.id && this.isEligible(o)
        );
    },

    /**
     * Get refill deadline
     */
    getRefillDeadline(order) {
        const orderDate = new Date(order.createdAt);
        return new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    },

    /**
     * Get days remaining for refill
     */
    getDaysRemaining(order) {
        const deadline = this.getRefillDeadline(order);
        const remaining = deadline.getTime() - Date.now();
        return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
    },

    /**
     * Render refill button for order
     */
    renderRefillButton(order) {
        if (!this.isEligible(order)) {
            if (order.refillRequested) {
                return `<span class="badge badge-info">${order.refillStatus || 'Refill Requested'}</span>`;
            }
            return '';
        }

        const daysLeft = this.getDaysRemaining(order);

        return `
            <button class="btn btn-sm btn-secondary" onclick="RefillMonitor.showRefillModal('${order.id}')">
                Request Refill
                <span class="badge badge-warning" style="margin-left: 4px;">${daysLeft}d left</span>
            </button>
        `;
    },

    /**
     * Show refill modal
     */
    async showRefillModal(orderId) {
        const orders = Storage.get('orders', []);
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            Notify.error('Order not found');
            return;
        }

        const daysLeft = this.getDaysRemaining(order);

        const confirmed = await Notify.confirm(
            `Request a free refill for order ${orderId}?\n\nService: ${order.serviceName}\nQuantity: ${Utils.formatNumber(order.quantity)}\nDays remaining: ${daysLeft}`,
            { title: 'Request Refill', confirmText: 'Request Refill' }
        );

        if (confirmed) {
            const result = await this.requestRefill(orderId);

            if (result.success) {
                Notify.success('Refill request submitted! We will process it shortly.');

                // Refresh orders if on orders page
                if (typeof App !== 'undefined' && App.currentPage === 'orders') {
                    App.renderOrders();
                }
            } else {
                Notify.error(result.error);
            }
        }
    },

    /**
     * Get pending refill count (admin)
     */
    getPendingRefillCount() {
        const orders = Storage.get('orders', []);
        return orders.filter(o => o.refillRequested && o.refillStatus === 'Pending').length;
    },

    /**
     * Process refill (admin)
     */
    processRefill(orderId, success = true) {
        if (!Auth.isAdmin()) return { success: false, error: 'Admin access required' };

        const orders = Storage.get('orders', []);
        const index = orders.findIndex(o => o.id === orderId);

        if (index === -1) return { success: false, error: 'Order not found' };

        orders[index].refillStatus = success ? 'Completed' : 'Failed';
        orders[index].refillProcessedAt = new Date().toISOString();

        Storage.set('orders', orders);

        Auth.logActivity('refill_process', { orderId, success });

        return { success: true };
    }
};

// Export for use
window.RefillMonitor = RefillMonitor;
