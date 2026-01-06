/**
 * SMMFamy - Mass Order System
 * Bulk order processing for multiple links | ~300 lines
 */

const MassOrder = {
    /**
     * Parse mass order input
     * Supports formats:
     * - One link per line
     * - link|quantity format
     */
    parseInput(text, defaultQuantity = 1000) {
        const lines = text.split('\n').filter(line => line.trim());
        const orders = [];
        const errors = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Check for link|quantity format
            const parts = trimmed.split('|').map(p => p.trim());
            let link = parts[0];
            let quantity = parts[1] ? parseInt(parts[1]) : defaultQuantity;

            // Validate URL
            if (!Utils.isValidUrl(link)) {
                errors.push({ line: index + 1, error: 'Invalid URL', value: link });
                return;
            }

            // Validate quantity
            if (isNaN(quantity) || quantity < 1) {
                quantity = defaultQuantity;
            }

            orders.push({
                link,
                quantity,
                lineNumber: index + 1
            });
        });

        return { orders, errors };
    },

    /**
     * Calculate mass order total
     */
    calculateTotal(orders, service) {
        if (!service) return 0;

        let total = 0;
        orders.forEach(order => {
            // Ensure quantity is within service limits
            const qty = Math.min(Math.max(order.quantity, service.min), service.max);
            total += SMMApi.calculateTotal(service.rate, qty);
        });

        return total;
    },

    /**
     * Validate orders against service limits
     */
    validateOrders(orders, service) {
        const validated = [];
        const warnings = [];

        orders.forEach(order => {
            let qty = order.quantity;

            if (qty < service.min) {
                warnings.push({
                    line: order.lineNumber,
                    warning: `Quantity adjusted from ${qty} to minimum ${service.min}`
                });
                qty = service.min;
            }

            if (qty > service.max) {
                warnings.push({
                    line: order.lineNumber,
                    warning: `Quantity adjusted from ${qty} to maximum ${service.max}`
                });
                qty = service.max;
            }

            validated.push({
                ...order,
                quantity: qty,
                charge: SMMApi.calculateTotal(service.rate, qty)
            });
        });

        return { validated, warnings };
    },

    /**
     * Process mass order
     */
    async process(orders, service) {
        const user = Auth.getCurrentUser();
        if (!user) return { success: false, error: 'Not logged in' };

        const total = this.calculateTotal(orders, service);
        const balance = Auth.getBalance();

        if (balance < total && balance !== Infinity) {
            return { success: false, error: 'Insufficient balance' };
        }

        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (const order of orders) {
            try {
                // Deduct funds
                const charge = SMMApi.calculateTotal(service.rate, order.quantity);

                if (!Auth.deductFunds(charge)) {
                    results.push({
                        link: order.link,
                        success: false,
                        error: 'Failed to deduct balance'
                    });
                    failCount++;
                    continue;
                }

                // Create order
                const orderData = {
                    service: service.service,
                    serviceName: service.name,
                    link: order.link,
                    quantity: order.quantity,
                    charge,
                    pricePerK: service.rate,
                    isMassOrder: true
                };

                const createdOrder = Auth.createOrder(orderData);

                if (createdOrder) {
                    results.push({
                        link: order.link,
                        success: true,
                        orderId: createdOrder.id,
                        charge
                    });
                    successCount++;
                } else {
                    // Refund on failure
                    Auth.addFunds(charge);
                    results.push({
                        link: order.link,
                        success: false,
                        error: 'Failed to create order'
                    });
                    failCount++;
                }

                // Small delay between orders
                await Utils.sleep(100);

            } catch (error) {
                results.push({
                    link: order.link,
                    success: false,
                    error: error.message
                });
                failCount++;
            }
        }

        Auth.logActivity('mass_order', {
            serviceId: service.service,
            total: orders.length,
            success: successCount,
            failed: failCount
        });

        return {
            success: true,
            results,
            summary: { total: orders.length, success: successCount, failed: failCount }
        };
    },

    /**
     * Show mass order modal
     */
    showModal(service) {
        if (!service) {
            Notify.error('Please select a service first');
            return;
        }

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop open';

        const modal = document.createElement('div');
        modal.className = 'modal modal-lg open';
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Mass Order</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info" style="margin-bottom: var(--space-4);">
                    <div class="alert-content">
                        <div class="alert-title">Selected Service</div>
                        <p>#${service.service} - ${service.name}</p>
                        <p>Price: ${SMMApi.formatPrice(service.rate)} per 1000</p>
                        <p>Min: ${Utils.formatNumber(service.min)} | Max: ${Utils.formatNumber(service.max)}</p>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Default Quantity (per link)</label>
                    <input type="number" class="form-input" id="massDefaultQty" 
                           value="${service.min}" min="${service.min}" max="${service.max}">
                </div>
                
                <div class="form-group">
                    <label class="form-label form-label-required">Links (one per line)</label>
                    <textarea class="form-textarea" id="massOrderInput" rows="10" 
                              placeholder="https://instagram.com/post1
https://instagram.com/post2|5000
https://instagram.com/post3

Tip: Add |quantity after link to set custom quantity"></textarea>
                    <div class="form-helper">Format: link or link|quantity (one per line)</div>
                </div>
                
                <div id="massOrderPreview" style="display: none;">
                    <div class="divider" style="margin: var(--space-4) 0;"></div>
                    <h4 style="margin-bottom: var(--space-3);">Order Preview</h4>
                    <div id="massOrderSummary"></div>
                    <div id="massOrderWarnings"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary btn-cancel">Cancel</button>
                <button class="btn btn-primary btn-preview">Preview Orders</button>
                <button class="btn btn-success btn-submit" style="display: none;">Submit All Orders</button>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        const close = () => {
            backdrop.remove();
            modal.remove();
        };

        modal.querySelector('.modal-close').addEventListener('click', close);
        modal.querySelector('.btn-cancel').addEventListener('click', close);
        backdrop.addEventListener('click', close);

        // Preview handler
        let validatedOrders = [];

        modal.querySelector('.btn-preview').addEventListener('click', () => {
            const input = modal.querySelector('#massOrderInput').value;
            const defaultQty = parseInt(modal.querySelector('#massDefaultQty').value) || service.min;

            const { orders, errors } = this.parseInput(input, defaultQty);

            if (orders.length === 0) {
                Notify.error('No valid links found');
                return;
            }

            const { validated, warnings } = this.validateOrders(orders, service);
            validatedOrders = validated;

            const total = this.calculateTotal(validated, service);
            const balance = Auth.getBalance();

            // Show preview
            const previewEl = modal.querySelector('#massOrderPreview');
            const summaryEl = modal.querySelector('#massOrderSummary');
            const warningsEl = modal.querySelector('#massOrderWarnings');

            previewEl.style.display = 'block';

            summaryEl.innerHTML = `
                <div class="card card-flat" style="margin-bottom: var(--space-3);">
                    <div class="grid grid-cols-3 gap-4" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="text-center">
                            <div class="text-2xl font-bold">${validated.length}</div>
                            <div class="text-sm text-muted">Total Orders</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-primary">${SMMApi.formatPrice(total)}</div>
                            <div class="text-sm text-muted">Total Cost</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold ${balance >= total || balance === Infinity ? 'text-success' : 'text-error'}">
                                ${balance === Infinity ? '∞' : SMMApi.formatPrice(balance)}
                            </div>
                            <div class="text-sm text-muted">Your Balance</div>
                        </div>
                    </div>
                </div>
            `;

            // Show errors and warnings
            let alertHtml = '';

            if (errors.length > 0) {
                alertHtml += `
                    <div class="alert alert-error" style="margin-bottom: var(--space-2);">
                        <div class="alert-content">
                            <div class="alert-title">${errors.length} Invalid Link(s)</div>
                            ${errors.slice(0, 3).map(e => `<p>Line ${e.line}: ${e.error}</p>`).join('')}
                            ${errors.length > 3 ? `<p>...and ${errors.length - 3} more</p>` : ''}
                        </div>
                    </div>
                `;
            }

            if (warnings.length > 0) {
                alertHtml += `
                    <div class="alert alert-warning" style="margin-bottom: var(--space-2);">
                        <div class="alert-content">
                            <div class="alert-title">${warnings.length} Quantity Adjustment(s)</div>
                            ${warnings.slice(0, 3).map(w => `<p>Line ${w.line}: ${w.warning}</p>`).join('')}
                            ${warnings.length > 3 ? `<p>...and ${warnings.length - 3} more</p>` : ''}
                        </div>
                    </div>
                `;
            }

            if (balance < total && balance !== Infinity) {
                alertHtml += `
                    <div class="alert alert-error">
                        <div class="alert-content">
                            <div class="alert-title">Insufficient Balance</div>
                            <p>You need ${SMMApi.formatPrice(total - balance)} more to complete this order.</p>
                        </div>
                    </div>
                `;
            }

            warningsEl.innerHTML = alertHtml;

            // Show/hide submit button
            const submitBtn = modal.querySelector('.btn-submit');
            if (validated.length > 0 && (balance >= total || balance === Infinity)) {
                submitBtn.style.display = 'inline-flex';
            } else {
                submitBtn.style.display = 'none';
            }
        });

        // Submit handler
        modal.querySelector('.btn-submit').addEventListener('click', async () => {
            if (validatedOrders.length === 0) {
                Notify.error('No orders to submit');
                return;
            }

            const confirmed = await Notify.confirm(
                `Submit ${validatedOrders.length} orders for ${SMMApi.formatPrice(this.calculateTotal(validatedOrders, service))}?`,
                { title: 'Confirm Mass Order', confirmText: 'Submit All' }
            );

            if (!confirmed) return;

            const submitBtn = modal.querySelector('.btn-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> Processing...';

            const result = await this.process(validatedOrders, service);

            if (result.success) {
                Notify.success(`Mass order complete: ${result.summary.success}/${result.summary.total} successful`);
                close();

                // Update navigation
                if (typeof App !== 'undefined') {
                    App.updateNavigation();
                }
            } else {
                Notify.error(result.error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit All Orders';
            }
        });
    }
};

// Export for use
window.MassOrder = MassOrder;
