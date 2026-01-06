/**
 * SMMFamy - Payment System
 * Manual payment via GCash/Maya with Messenger verification
 * ~400 lines
 */

const Payments = {
    // Payment Configuration
    config: {
        // GCash Details
        gcash: {
            name: 'M** P*****',
            number: '09703659873',
            qrCode: 'assets/qr/gcash-qr.png',
            enabled: true
        },

        // Maya Details
        maya: {
            name: 'M** P*****',
            number: '09703659873',
            qrCode: 'assets/qr/maya-qr.png',
            enabled: true
        },

        // Bank Transfer (Currently unavailable)
        bank: {
            name: 'Currently Unavailable',
            accounts: [],
            enabled: false
        },

        // Messenger Link for verification
        messengerLink: '#', // Placeholder - to be updated

        // Minimum deposit amount
        minDeposit: 50,

        // Quick amount options
        quickAmounts: [100, 250, 500, 1000, 2500, 5000]
    },

    /**
     * Get enabled payment methods
     */
    getEnabledMethods() {
        const methods = [];

        if (this.config.gcash.enabled) {
            methods.push({
                id: 'gcash',
                name: 'GCash',
                description: 'Send via GCash',
                icon: 'G',
                ...this.config.gcash
            });
        }

        if (this.config.maya.enabled) {
            methods.push({
                id: 'maya',
                name: 'Maya / PayMaya',
                description: 'Send via Maya',
                icon: 'M',
                ...this.config.maya
            });
        }

        if (this.config.bank.enabled) {
            methods.push({
                id: 'bank',
                name: 'Bank Transfer',
                description: 'BDO, BPI, UnionBank',
                icon: 'B',
                ...this.config.bank
            });
        }

        return methods;
    },

    /**
     * Create pending payment request
     */
    createPaymentRequest(amount, method) {
        const user = Auth.getCurrentUser();
        if (!user) return null;

        // Validate amount
        if (amount < this.config.minDeposit) {
            return {
                success: false,
                error: `Minimum deposit is ${SMMApi.formatPrice(this.config.minDeposit)}`
            };
        }

        const request = {
            id: Utils.generateTxnId(),
            userId: user.id,
            userEmail: user.email,
            amount: parseFloat(amount),
            method: method,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        // Save to pending payments
        const pending = Storage.get('pendingPayments', []);
        pending.unshift(request);
        Storage.set('pendingPayments', pending);

        // Log activity
        Auth.logActivity('payment_request', {
            amount,
            method,
            txnId: request.id
        });

        return { success: true, request };
    },

    /**
     * Generate Messenger message
     */
    generateMessengerMessage(request) {
        const user = Auth.getCurrentUser();

        return `Hi! I just added funds to SMMFamy.

📋 Payment Details:
━━━━━━━━━━━━━━━━━━
Amount: ${SMMApi.formatPrice(request.amount)}
Method: ${request.method.toUpperCase()}
Reference: ${request.id}
Email: ${user?.email || 'N/A'}
━━━━━━━━━━━━━━━━━━

Please verify my payment and add funds to my account. I have attached the payment screenshot/receipt.

Thank you!`;
    },

    /**
     * Get Messenger link with pre-filled message
     */
    getMessengerLink(request) {
        const message = this.generateMessengerMessage(request);

        // If messenger link is set, use it
        if (this.config.messengerLink && this.config.messengerLink !== '#') {
            // Encode message for URL
            const encoded = encodeURIComponent(message);
            return `${this.config.messengerLink}?text=${encoded}`;
        }

        // Fallback - just return placeholder
        return '#';
    },

    /**
     * Get payment instructions
     */
    getPaymentInstructions(method) {
        const methodConfig = this.config[method];

        if (!methodConfig || !methodConfig.enabled) {
            return null;
        }

        return {
            steps: [
                `Open your ${method === 'gcash' ? 'GCash' : 'Maya'} app`,
                `Go to "Send Money"`,
                `Enter number: ${methodConfig.number}`,
                `Enter the exact amount`,
                `Complete the payment`,
                `Take a screenshot of the receipt`,
                `Click "I've Paid" and send screenshot via Messenger`
            ],
            accountName: methodConfig.name,
            accountNumber: methodConfig.number,
            qrCode: methodConfig.qrCode
        };
    },

    /**
     * Mark payment as "I've Paid"
     */
    markAsPaid(requestId) {
        const pending = Storage.get('pendingPayments', []);
        const index = pending.findIndex(p => p.id === requestId);

        if (index === -1) return false;

        pending[index].status = 'awaiting_verification';
        pending[index].paidAt = new Date().toISOString();

        Storage.set('pendingPayments', pending);

        Auth.logActivity('payment_marked_paid', { txnId: requestId });

        return true;
    },

    /**
     * Get user's pending payments
     */
    getUserPendingPayments() {
        const user = Auth.getCurrentUser();
        if (!user) return [];

        const pending = Storage.get('pendingPayments', []);
        return pending.filter(p => p.userId === user.id && p.status !== 'completed');
    },

    /**
     * Get all pending payments (admin)
     */
    getAllPendingPayments() {
        if (!Auth.isAdmin()) return [];
        return Storage.get('pendingPayments', []).filter(p => p.status !== 'completed');
    },

    /**
     * Approve payment (admin)
     */
    approvePayment(requestId) {
        if (!Auth.isAdmin()) return false;

        const pending = Storage.get('pendingPayments', []);
        const index = pending.findIndex(p => p.id === requestId);

        if (index === -1) return false;

        const request = pending[index];

        // Add funds to user
        const users = Storage.get('users', [], { encrypted: true });
        const userIndex = users.findIndex(u => u.id === request.userId);

        if (userIndex !== -1) {
            users[userIndex].balance = (parseFloat(users[userIndex].balance) || 0) + request.amount;
            Storage.set('users', users, { encrypted: true });

            // Update current user if it's them
            const currentUser = Auth.getCurrentUser();
            if (currentUser && currentUser.id === request.userId) {
                currentUser.balance = users[userIndex].balance;
                Storage.set('currentUser', currentUser);
            }
        }

        // Mark as completed
        pending[index].status = 'completed';
        pending[index].approvedAt = new Date().toISOString();
        pending[index].approvedBy = Auth.getCurrentUser()?.email;

        Storage.set('pendingPayments', pending);

        // Create transaction record
        const transactions = Storage.get('transactions', []);
        transactions.unshift({
            id: request.id,
            userId: request.userId,
            userEmail: request.userEmail,
            type: 'deposit',
            amount: request.amount,
            method: request.method,
            status: 'completed',
            createdAt: request.createdAt,
            completedAt: new Date().toISOString()
        });
        Storage.set('transactions', transactions);

        Auth.logActivity('admin_approve_payment', {
            txnId: requestId,
            amount: request.amount,
            userId: request.userId
        });

        return true;
    },

    /**
     * Reject payment (admin)
     */
    rejectPayment(requestId, reason = '') {
        if (!Auth.isAdmin()) return false;

        const pending = Storage.get('pendingPayments', []);
        const index = pending.findIndex(p => p.id === requestId);

        if (index === -1) return false;

        pending[index].status = 'rejected';
        pending[index].rejectedAt = new Date().toISOString();
        pending[index].rejectedBy = Auth.getCurrentUser()?.email;
        pending[index].rejectReason = reason;

        Storage.set('pendingPayments', pending);

        Auth.logActivity('admin_reject_payment', {
            txnId: requestId,
            reason
        });

        return true;
    },

    /**
     * Get transaction history
     */
    getTransactionHistory() {
        const user = Auth.getCurrentUser();
        if (!user) return [];

        const transactions = Storage.get('transactions', []);

        if (user.isAdmin) {
            return transactions;
        }

        return transactions.filter(t => t.userId === user.id);
    },

    /**
     * Render payment method selector
     */
    renderPaymentMethods(containerId, selectedCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const methods = this.getEnabledMethods();

        container.innerHTML = methods.map((method, index) => `
            <label class="payment-method ${index === 0 ? 'selected' : ''}" data-method="${method.id}">
                <input type="radio" name="paymentMethod" value="${method.id}" ${index === 0 ? 'checked' : ''}>
                <div class="payment-method-icon">${method.icon}</div>
                <div class="payment-method-info">
                    <div class="payment-method-name">${method.name}</div>
                    <div class="payment-method-desc">${method.description}</div>
                </div>
                <div class="payment-method-check">✓</div>
            </label>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.payment-method').forEach(el => {
            el.addEventListener('click', () => {
                container.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                el.classList.add('selected');
                el.querySelector('input').checked = true;

                if (selectedCallback) {
                    selectedCallback(el.dataset.method);
                }
            });
        });
    },

    /**
     * Render quick amount buttons
     */
    renderQuickAmounts(containerId, inputId) {
        const container = document.getElementById(containerId);
        const input = document.getElementById(inputId);
        if (!container || !input) return;

        container.innerHTML = this.config.quickAmounts.map(amount => `
            <button type="button" class="amount-btn" data-amount="${amount}">
                ${SMMApi.formatPrice(amount)}
            </button>
        `).join('');

        container.querySelectorAll('.amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                input.value = btn.dataset.amount;
                input.dispatchEvent(new Event('input'));
            });
        });
    },

    /**
     * Render payment instructions modal
     */
    showPaymentInstructions(request) {
        const method = request.method;
        const instructions = this.getPaymentInstructions(method);

        if (!instructions) {
            Notify.error('Payment method not available');
            return;
        }

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop open';

        const modal = document.createElement('div');
        modal.className = 'modal modal-md open';
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Payment Instructions</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info">
                    <div class="alert-content">
                        <strong>Reference ID:</strong> ${request.id}<br>
                        <strong>Amount:</strong> ${SMMApi.formatPrice(request.amount)}
                    </div>
                </div>
                
                <div class="payment-instructions" style="margin-top: var(--space-4);">
                    <div class="payment-qr">
                        <img src="${instructions.qrCode}" alt="QR Code" onerror="this.src='https://www.youtube.com/redirect?q=https://www.youtube.com/watch?v=dQw4w9WgXcQ'">
                    </div>
                    
                    <div class="payment-details">
                        <div class="payment-details-row">
                            <div class="payment-details-label">Account Name</div>
                            <div class="payment-details-value">${instructions.accountName}</div>
                        </div>
                        <div class="payment-details-row">
                            <div class="payment-details-label">Account Number</div>
                            <div class="payment-details-value" style="font-family: var(--font-mono);">${instructions.accountNumber}</div>
                        </div>
                        <div class="payment-details-row">
                            <div class="payment-details-label">Amount to Send</div>
                            <div class="payment-details-value text-primary">${SMMApi.formatPrice(request.amount)}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: var(--space-6);">
                    <h4 style="margin-bottom: var(--space-3);">Steps:</h4>
                    <ol style="padding-left: var(--space-5); color: var(--text-secondary);">
                        ${instructions.steps.map(step => `<li style="margin-bottom: var(--space-2);">${step}</li>`).join('')}
                    </ol>
                </div>
            </div>
            <div class="modal-footer" style="flex-direction: column; align-items: stretch;">
                <button class="btn btn-primary btn-lg btn-mark-paid" style="width: 100%;">
                    I've Paid - Open Messenger
                </button>
                <button class="btn btn-ghost btn-cancel" style="width: 100%; margin-top: var(--space-2);">
                    Cancel
                </button>
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

        modal.querySelector('.btn-mark-paid').addEventListener('click', () => {
            this.markAsPaid(request.id);

            // Copy message to clipboard
            const message = this.generateMessengerMessage(request);
            Utils.copyToClipboard(message);

            Notify.success('Payment marked! Message copied to clipboard. Opening Messenger...');

            // Open messenger (or show alert if link not set)
            const messengerLink = this.getMessengerLink(request);
            if (messengerLink !== '#') {
                window.open(messengerLink, '_blank');
            } else {
                Notify.info('Please send your payment screenshot to our Facebook Messenger.');
            }

            close();
        });
    }
};

// Export for use
window.Payments = Payments;
