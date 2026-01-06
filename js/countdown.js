/**
 * SMMFamy - Countdown Timer & Flash Sales
 * Limited-time offers and countdown displays | ~200 lines
 */

const Countdown = {
    timers: new Map(),

    /**
     * Create countdown timer
     */
    create(elementId, endTime, options = {}) {
        const defaults = {
            onComplete: null,
            format: 'full', // full, compact, minimal
            labels: {
                days: 'd',
                hours: 'h',
                minutes: 'm',
                seconds: 's'
            }
        };

        const config = { ...defaults, ...options };
        const element = document.getElementById(elementId);

        if (!element) return null;

        const endDate = new Date(endTime).getTime();

        const update = () => {
            const now = Date.now();
            const remaining = endDate - now;

            if (remaining <= 0) {
                element.innerHTML = config.format === 'minimal' ? '00:00:00' : 'Ended';

                if (config.onComplete) {
                    config.onComplete();
                }

                this.stop(elementId);
                return;
            }

            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            let html = '';

            if (config.format === 'full') {
                html = `
                    <div class="countdown-item">
                        <div class="countdown-value">${String(days).padStart(2, '0')}</div>
                        <div class="countdown-label">Days</div>
                    </div>
                    <div class="countdown-separator">:</div>
                    <div class="countdown-item">
                        <div class="countdown-value">${String(hours).padStart(2, '0')}</div>
                        <div class="countdown-label">Hours</div>
                    </div>
                    <div class="countdown-separator">:</div>
                    <div class="countdown-item">
                        <div class="countdown-value">${String(minutes).padStart(2, '0')}</div>
                        <div class="countdown-label">Minutes</div>
                    </div>
                    <div class="countdown-separator">:</div>
                    <div class="countdown-item">
                        <div class="countdown-value">${String(seconds).padStart(2, '0')}</div>
                        <div class="countdown-label">Seconds</div>
                    </div>
                `;
            } else if (config.format === 'compact') {
                html = `
                    ${days > 0 ? `<span>${days}${config.labels.days}</span> ` : ''}
                    <span>${String(hours).padStart(2, '0')}${config.labels.hours}</span>
                    <span>${String(minutes).padStart(2, '0')}${config.labels.minutes}</span>
                    <span>${String(seconds).padStart(2, '0')}${config.labels.seconds}</span>
                `;
            } else {
                html = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            element.innerHTML = html;
        };

        // Initial update
        update();

        // Start interval
        const intervalId = setInterval(update, 1000);
        this.timers.set(elementId, intervalId);

        return intervalId;
    },

    /**
     * Stop countdown timer
     */
    stop(elementId) {
        const intervalId = this.timers.get(elementId);
        if (intervalId) {
            clearInterval(intervalId);
            this.timers.delete(elementId);
        }
    },

    /**
     * Stop all timers
     */
    stopAll() {
        this.timers.forEach((intervalId, elementId) => {
            clearInterval(intervalId);
        });
        this.timers.clear();
    }
};

/**
 * Flash Sales System
 */
const FlashSales = {
    /**
     * Get active flash sales
     */
    getActive() {
        const sales = Storage.get('flashSales', []);
        const now = Date.now();

        return sales.filter(sale => {
            const start = new Date(sale.startAt).getTime();
            const end = new Date(sale.endAt).getTime();
            return now >= start && now <= end;
        });
    },

    /**
     * Get upcoming flash sales
     */
    getUpcoming() {
        const sales = Storage.get('flashSales', []);
        const now = Date.now();

        return sales.filter(sale => {
            const start = new Date(sale.startAt).getTime();
            return now < start;
        }).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    },

    /**
     * Create flash sale (admin)
     */
    create(data) {
        if (!Auth.isAdmin()) return { success: false, error: 'Admin access required' };

        const sale = {
            id: Utils.generateId('SALE_'),
            name: data.name,
            discountPercent: data.discountPercent,
            services: data.services || [], // Empty = all services
            startAt: data.startAt,
            endAt: data.endAt,
            createdAt: new Date().toISOString()
        };

        const sales = Storage.get('flashSales', []);
        sales.push(sale);
        Storage.set('flashSales', sales);

        Auth.logActivity('flash_sale_create', { saleId: sale.id, name: sale.name });

        return { success: true, sale };
    },

    /**
     * Get discounted price for service
     */
    getDiscountedPrice(service) {
        const activeSales = this.getActive();

        for (const sale of activeSales) {
            // Check if service is included
            if (sale.services.length === 0 || sale.services.includes(service.service)) {
                const originalPrice = parseFloat(service.rate);
                const discountedPrice = originalPrice * (1 - sale.discountPercent / 100);

                return {
                    originalPrice,
                    discountedPrice: SMMApi.roundToFlat(discountedPrice),
                    discountPercent: sale.discountPercent,
                    saleName: sale.name,
                    saleEndsAt: sale.endAt
                };
            }
        }

        return null;
    },

    /**
     * Render flash sale banner
     */
    renderBanner(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const activeSales = this.getActive();

        if (activeSales.length === 0) {
            container.style.display = 'none';
            return;
        }

        const sale = activeSales[0]; // Show first active sale

        container.style.display = 'block';
        container.innerHTML = `
            <div class="flash-sale-banner" style="
                background: linear-gradient(135deg, var(--color-error-500), var(--color-primary-600));
                color: white;
                padding: var(--space-4);
                border-radius: var(--radius-lg);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: var(--space-4);
            ">
                <div>
                    <div style="font-size: var(--text-lg); font-weight: var(--font-bold);">
                        Flash Sale: ${sale.name}
                    </div>
                    <div style="font-size: var(--text-2xl); font-weight: var(--font-extrabold);">
                        ${sale.discountPercent}% OFF
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: var(--text-sm); opacity: 0.9;">Ends in:</div>
                    <div id="flashSaleCountdown" class="countdown" style="font-size: var(--text-xl); font-weight: var(--font-bold);"></div>
                </div>
            </div>
        `;

        Countdown.create('flashSaleCountdown', sale.endAt, {
            format: 'compact',
            onComplete: () => this.renderBanner(containerId)
        });
    }
};

// Export for use
window.Countdown = Countdown;
window.FlashSales = FlashSales;
