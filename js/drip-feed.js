/**
 * SMMFamy - Drip Feed System
 * Gradual order delivery over time | ~250 lines
 */

const DripFeed = {
    // Drip feed intervals
    intervals: {
        minutes: { value: 1, label: 'Minutes' },
        hours: { value: 60, label: 'Hours' },
        days: { value: 1440, label: 'Days' }
    },

    /**
     * Calculate drip feed schedule
     */
    calculateSchedule(quantity, runs, interval, intervalUnit) {
        const perRun = Math.floor(quantity / runs);
        const remainder = quantity % runs;
        const intervalMinutes = interval * this.intervals[intervalUnit].value;

        const schedule = [];
        let currentTime = Date.now();

        for (let i = 0; i < runs; i++) {
            const runQuantity = perRun + (i < remainder ? 1 : 0);
            schedule.push({
                run: i + 1,
                quantity: runQuantity,
                scheduledAt: new Date(currentTime).toISOString(),
                status: 'pending'
            });
            currentTime += intervalMinutes * 60 * 1000;
        }

        return {
            totalQuantity: quantity,
            runs,
            interval,
            intervalUnit,
            intervalMinutes,
            perRun,
            totalDuration: (runs - 1) * intervalMinutes,
            estimatedCompletion: new Date(currentTime - intervalMinutes * 60 * 1000).toISOString(),
            schedule
        };
    },

    /**
     * Format duration
     */
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (minutes < 1440) {
            const hours = Math.floor(minutes / 60);
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(minutes / 1440);
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
    },

    /**
     * Create drip feed order
     */
    createOrder(orderData, dripConfig) {
        const user = Auth.getCurrentUser();
        if (!user) return { success: false, error: 'Not logged in' };

        const schedule = this.calculateSchedule(
            orderData.quantity,
            dripConfig.runs,
            dripConfig.interval,
            dripConfig.intervalUnit
        );

        const order = {
            id: Utils.generateOrderId(),
            userId: user.id,
            userEmail: user.email,
            ...orderData,
            isDripFeed: true,
            dripFeed: schedule,
            status: 'Processing',
            createdAt: new Date().toISOString()
        };

        const orders = Storage.get('orders', []);
        orders.unshift(order);
        Storage.set('orders', orders);

        Stats.recordOrder(orderData.quantity);
        Auth.logActivity('drip_feed_order', {
            orderId: order.id,
            runs: schedule.runs,
            duration: schedule.totalDuration
        });

        return { success: true, order };
    },

    /**
     * Get drip feed status
     */
    getDripFeedStatus(orderId) {
        const orders = Storage.get('orders', []);
        const order = orders.find(o => o.id === orderId && o.isDripFeed);

        if (!order) return null;

        const completed = order.dripFeed.schedule.filter(s => s.status === 'completed').length;
        const progress = (completed / order.dripFeed.runs) * 100;

        return {
            orderId,
            totalRuns: order.dripFeed.runs,
            completedRuns: completed,
            progress,
            nextRun: order.dripFeed.schedule.find(s => s.status === 'pending'),
            estimatedCompletion: order.dripFeed.estimatedCompletion
        };
    },

    /**
     * Render drip feed options
     */
    renderOptions(containerId, service) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="drip-feed-toggle" style="margin-bottom: var(--space-4);">
                <label class="form-check">
                    <input type="checkbox" class="form-check-input" id="enableDripFeed">
                    <span class="form-check-label">Enable Drip Feed</span>
                </label>
                <div class="form-helper">Gradually deliver the order over time for natural growth</div>
            </div>
            
            <div class="drip-feed-config" id="dripFeedConfig" style="display: none;">
                <div class="grid gap-4" style="grid-template-columns: 1fr 1fr 1fr;">
                    <div class="form-group">
                        <label class="form-label">Number of Runs</label>
                        <input type="number" class="form-input" id="dripRuns" 
                               value="5" min="2" max="100">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Interval</label>
                        <input type="number" class="form-input" id="dripInterval" 
                               value="30" min="1" max="1000">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unit</label>
                        <select class="form-select" id="dripIntervalUnit">
                            <option value="minutes">Minutes</option>
                            <option value="hours" selected>Hours</option>
                            <option value="days">Days</option>
                        </select>
                    </div>
                </div>
                
                <div class="card card-flat" id="dripFeedPreview" style="margin-top: var(--space-4);">
                    <p class="text-muted">Configure quantity above to see delivery schedule</p>
                </div>
            </div>
        `;

        const toggle = container.querySelector('#enableDripFeed');
        const config = container.querySelector('#dripFeedConfig');

        toggle.addEventListener('change', () => {
            config.style.display = toggle.checked ? 'block' : 'none';
        });

        // Preview update
        const updatePreview = () => {
            if (!toggle.checked) return;

            const quantity = parseInt(document.getElementById('orderQuantity')?.value || service.min);
            const runs = parseInt(container.querySelector('#dripRuns').value) || 5;
            const interval = parseInt(container.querySelector('#dripInterval').value) || 30;
            const intervalUnit = container.querySelector('#dripIntervalUnit').value;

            const schedule = this.calculateSchedule(quantity, runs, interval, intervalUnit);
            const previewEl = container.querySelector('#dripFeedPreview');

            previewEl.innerHTML = `
                <div class="grid grid-cols-2 gap-4" style="grid-template-columns: 1fr 1fr;">
                    <div>
                        <div class="text-sm text-muted">Per Run</div>
                        <div class="font-bold">${Utils.formatNumber(schedule.perRun)}</div>
                    </div>
                    <div>
                        <div class="text-sm text-muted">Total Duration</div>
                        <div class="font-bold">${this.formatDuration(schedule.totalDuration)}</div>
                    </div>
                    <div>
                        <div class="text-sm text-muted">Total Runs</div>
                        <div class="font-bold">${schedule.runs}</div>
                    </div>
                    <div>
                        <div class="text-sm text-muted">Est. Completion</div>
                        <div class="font-bold">${Utils.formatDate(schedule.estimatedCompletion, 'datetime')}</div>
                    </div>
                </div>
            `;
        };

        container.querySelector('#dripRuns').addEventListener('input', updatePreview);
        container.querySelector('#dripInterval').addEventListener('input', updatePreview);
        container.querySelector('#dripIntervalUnit').addEventListener('change', updatePreview);

        // Also update when quantity changes
        const qtyInput = document.getElementById('orderQuantity');
        if (qtyInput) {
            qtyInput.addEventListener('input', updatePreview);
        }
    },

    /**
     * Get drip feed config from form
     */
    getConfig(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const enabled = container.querySelector('#enableDripFeed')?.checked;
        if (!enabled) return null;

        return {
            runs: parseInt(container.querySelector('#dripRuns').value) || 5,
            interval: parseInt(container.querySelector('#dripInterval').value) || 30,
            intervalUnit: container.querySelector('#dripIntervalUnit').value || 'hours'
        };
    }
};

// Export for use
window.DripFeed = DripFeed;
