/**
 * SMMFamy - Referral System
 * Affiliate/referral program management | ~300 lines
 */

const Referrals = {
    // Referral settings
    config: {
        commissionPercent: 10, // 10% commission
        minPayout: 500, // Minimum payout amount
        cookieDays: 30 // Referral tracking duration
    },

    /**
     * Generate referral code for user
     */
    generateCode(userId) {
        const code = 'REF-' + userId.substring(0, 8).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        return code;
    },

    /**
     * Get or create user's referral code
     */
    getUserCode() {
        const user = Auth.getCurrentUser();
        if (!user) return null;

        const codes = Storage.get('referralCodes', {});

        if (!codes[user.id]) {
            codes[user.id] = {
                code: this.generateCode(user.id),
                createdAt: new Date().toISOString()
            };
            Storage.set('referralCodes', codes);
        }

        return codes[user.id].code;
    },

    /**
     * Get referral link
     */
    getReferralLink() {
        const code = this.getUserCode();
        if (!code) return null;

        const baseUrl = window.location.origin;
        return `${baseUrl}/register.html?ref=${code}`;
    },

    /**
     * Track referral visit
     */
    trackVisit(refCode) {
        if (!refCode) return;

        // Store in cookie/session
        Storage.session.set('referralCode', refCode);

        // Log visit
        const visits = Storage.get('referralVisits', []);
        visits.push({
            code: refCode,
            timestamp: new Date().toISOString(),
            page: window.location.href
        });
        Storage.set('referralVisits', visits);
    },

    /**
     * Record referral on registration
     */
    recordReferral(newUserId, refCode) {
        if (!refCode) return;

        // Find referrer
        const codes = Storage.get('referralCodes', {});
        const referrerId = Object.keys(codes).find(userId =>
            codes[userId].code === refCode
        );

        if (!referrerId) return;

        // Create referral record
        const referrals = Storage.get('referrals', []);
        referrals.push({
            id: Utils.generateId('REF_'),
            referrerId,
            referredUserId: newUserId,
            refCode,
            status: 'pending',
            earnings: 0,
            createdAt: new Date().toISOString()
        });
        Storage.set('referrals', referrals);

        // Clear session
        Storage.session.remove('referralCode');
    },

    /**
     * Calculate and assign commission
     */
    assignCommission(orderId) {
        const orders = Storage.get('orders', []);
        const order = orders.find(o => o.id === orderId);

        if (!order) return;

        // Find referral relationship
        const referrals = Storage.get('referrals', []);
        const referral = referrals.find(r =>
            r.referredUserId === order.userId && r.status !== 'paid'
        );

        if (!referral) return;

        // Calculate commission
        const commission = parseFloat(order.charge) * (this.config.commissionPercent / 100);

        // Update referral earnings
        const index = referrals.findIndex(r => r.id === referral.id);
        referrals[index].earnings = (referrals[index].earnings || 0) + commission;
        referrals[index].status = 'active';
        referrals[index].lastEarning = new Date().toISOString();

        Storage.set('referrals', referrals);

        // Log commission
        const commissions = Storage.get('referralCommissions', []);
        commissions.push({
            id: Utils.generateId('COM_'),
            referralId: referral.id,
            referrerId: referral.referrerId,
            orderId,
            amount: commission,
            createdAt: new Date().toISOString()
        });
        Storage.set('referralCommissions', commissions);
    },

    /**
     * Get user's referral stats
     */
    getUserStats() {
        const user = Auth.getCurrentUser();
        if (!user) return null;

        const referrals = Storage.get('referrals', []);
        const userReferrals = referrals.filter(r => r.referrerId === user.id);

        const totalEarnings = userReferrals.reduce((sum, r) => sum + (r.earnings || 0), 0);
        const paidEarnings = userReferrals
            .filter(r => r.status === 'paid')
            .reduce((sum, r) => sum + (r.earnings || 0), 0);
        const pendingEarnings = totalEarnings - paidEarnings;

        return {
            code: this.getUserCode(),
            link: this.getReferralLink(),
            totalReferrals: userReferrals.length,
            activeReferrals: userReferrals.filter(r => r.status === 'active').length,
            totalEarnings,
            paidEarnings,
            pendingEarnings,
            canWithdraw: pendingEarnings >= this.config.minPayout
        };
    },

    /**
     * Get user's referred users
     */
    getReferredUsers() {
        const user = Auth.getCurrentUser();
        if (!user) return [];

        const referrals = Storage.get('referrals', []);
        const users = Storage.get('users', [], { encrypted: true });

        return referrals
            .filter(r => r.referrerId === user.id)
            .map(r => {
                const referredUser = users.find(u => u.id === r.referredUserId);
                return {
                    ...r,
                    userName: referredUser?.name || 'Unknown',
                    userEmail: referredUser?.email || 'Unknown'
                };
            });
    },

    /**
     * Request payout
     */
    requestPayout() {
        const user = Auth.getCurrentUser();
        if (!user) return { success: false, error: 'Not logged in' };

        const stats = this.getUserStats();

        if (stats.pendingEarnings < this.config.minPayout) {
            return {
                success: false,
                error: `Minimum payout is ${SMMApi.formatPrice(this.config.minPayout)}`
            };
        }

        // Create payout request
        const payouts = Storage.get('referralPayouts', []);
        payouts.push({
            id: Utils.generateId('PAY_'),
            userId: user.id,
            userEmail: user.email,
            amount: stats.pendingEarnings,
            status: 'pending',
            requestedAt: new Date().toISOString()
        });
        Storage.set('referralPayouts', payouts);

        // Mark referrals as paid
        const referrals = Storage.get('referrals', []);
        referrals.forEach((r, i) => {
            if (r.referrerId === user.id && r.status === 'active') {
                referrals[i].status = 'paid';
                referrals[i].paidAt = new Date().toISOString();
            }
        });
        Storage.set('referrals', referrals);

        Auth.logActivity('referral_payout_request', { amount: stats.pendingEarnings });

        return { success: true };
    },

    /**
     * Render referral dashboard
     */
    renderDashboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const stats = this.getUserStats();
        if (!stats) {
            container.innerHTML = '<p class="text-muted">Please log in to see your referral stats.</p>';
            return;
        }

        container.innerHTML = `
            <div class="card" style="margin-bottom: var(--space-4);">
                <h3 class="card-title" style="margin-bottom: var(--space-4);">Your Referral Link</h3>
                <div class="input-group">
                    <input type="text" class="form-input" value="${stats.link}" readonly id="referralLinkInput">
                    <button class="btn btn-primary" onclick="Utils.copyToClipboard(document.getElementById('referralLinkInput').value); Notify.success('Copied!');">
                        Copy
                    </button>
                </div>
                <div class="form-helper">Share this link to earn ${this.config.commissionPercent}% on all purchases made by your referrals!</div>
            </div>
            
            <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-bottom: var(--space-4);">
                <div class="card text-center">
                    <div class="text-2xl font-bold">${stats.totalReferrals}</div>
                    <div class="text-sm text-muted">Total Referrals</div>
                </div>
                <div class="card text-center">
                    <div class="text-2xl font-bold">${stats.activeReferrals}</div>
                    <div class="text-sm text-muted">Active Referrals</div>
                </div>
                <div class="card text-center">
                    <div class="text-2xl font-bold text-success">${SMMApi.formatPrice(stats.totalEarnings)}</div>
                    <div class="text-sm text-muted">Total Earned</div>
                </div>
                <div class="card text-center">
                    <div class="text-2xl font-bold text-primary">${SMMApi.formatPrice(stats.pendingEarnings)}</div>
                    <div class="text-sm text-muted">Available</div>
                </div>
            </div>
            
            ${stats.canWithdraw ? `
                <button class="btn btn-success btn-lg btn-block" onclick="Referrals.handlePayout()">
                    Request Payout (${SMMApi.formatPrice(stats.pendingEarnings)})
                </button>
            ` : `
                <div class="alert alert-info">
                    <div class="alert-content">
                        Minimum payout: ${SMMApi.formatPrice(this.config.minPayout)}. 
                        You need ${SMMApi.formatPrice(this.config.minPayout - stats.pendingEarnings)} more to withdraw.
                    </div>
                </div>
            `}
        `;
    },

    /**
     * Handle payout request
     */
    async handlePayout() {
        const confirmed = await Notify.confirm(
            'Request payout of your referral earnings? The amount will be added to your account balance.',
            { title: 'Confirm Payout Request' }
        );

        if (confirmed) {
            const result = this.requestPayout();
            if (result.success) {
                Notify.success('Payout request submitted! It will be processed within 24-48 hours.');
            } else {
                Notify.error(result.error);
            }
        }
    }
};

// Export for use
window.Referrals = Referrals;

// Check for referral code on page load
document.addEventListener('DOMContentLoaded', () => {
    const params = Utils.parseQueryString();
    if (params.ref) {
        Referrals.trackVisit(params.ref);
    }
});
