/**
 * SMMFamy - Admin API
 * Vercel Serverless Function
 * Handles: admin operations, payment approval, user management
 */

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'smmfamy-secret-key-change-in-production';
const ADMIN_EMAILS = ['kageroufs@gmail.com'];

function verifyToken(token) {
    try {
        const [header, body, signature] = token.split('.');
        const expectedSignature = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(`${header}.${body}`)
            .digest('base64url');

        if (signature !== expectedSignature) return null;

        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Date.now()) return null;

        return payload;
    } catch {
        return null;
    }
}

function isAdmin(user) {
    return user && (user.role === 'admin' || ADMIN_EMAILS.includes(user.email?.toLowerCase()));
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify admin role
    if (!isAdmin(user)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { action, ...data } = req.body;

    try {
        switch (action) {
            case 'dashboard': {
                // In production: fetch real stats from database
                return res.status(200).json({
                    success: true,
                    stats: {
                        totalUsers: 0,
                        totalOrders: 0,
                        totalRevenue: 0,
                        pendingPayments: 0,
                        activeTickets: 0
                    }
                });
            }

            case 'users': {
                const { page = 1, limit = 50, search } = data;
                // In production: fetch users from database with pagination
                return res.status(200).json({
                    success: true,
                    users: [],
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
            }

            case 'update_user': {
                const { userId, updates } = data;

                if (!userId) {
                    return res.status(400).json({ error: 'User ID required' });
                }

                // In production: update user in database
                return res.status(200).json({
                    success: true,
                    message: 'User updated successfully'
                });
            }

            case 'add_balance': {
                const { userId, amount, reason } = data;

                if (!userId || !amount) {
                    return res.status(400).json({ error: 'User ID and amount required' });
                }

                const amountNum = parseFloat(amount);
                if (isNaN(amountNum)) {
                    return res.status(400).json({ error: 'Invalid amount' });
                }

                // In production: update user balance in database
                // Log the transaction
                const transaction = {
                    id: 'txn_' + crypto.randomBytes(8).toString('hex'),
                    userId,
                    amount: amountNum,
                    type: amountNum > 0 ? 'credit' : 'debit',
                    reason: reason || 'Admin adjustment',
                    adminId: user.userId,
                    createdAt: new Date().toISOString()
                };

                return res.status(200).json({
                    success: true,
                    message: `Balance ${amountNum > 0 ? 'added' : 'deducted'} successfully`,
                    transaction
                });
            }

            case 'pending_payments': {
                // In production: fetch pending payments from database
                return res.status(200).json({
                    success: true,
                    payments: []
                });
            }

            case 'approve_payment': {
                const { paymentId, userId, amount } = data;

                if (!paymentId || !userId || !amount) {
                    return res.status(400).json({ error: 'Payment details required' });
                }

                // In production:
                // 1. Update payment status to 'approved'
                // 2. Add balance to user
                // 3. Create transaction record

                return res.status(200).json({
                    success: true,
                    message: 'Payment approved and balance added'
                });
            }

            case 'reject_payment': {
                const { paymentId, reason } = data;

                if (!paymentId) {
                    return res.status(400).json({ error: 'Payment ID required' });
                }

                // In production: update payment status to 'rejected'

                return res.status(200).json({
                    success: true,
                    message: 'Payment rejected'
                });
            }

            case 'orders': {
                const { page = 1, limit = 50, status } = data;
                // In production: fetch orders from database with pagination
                return res.status(200).json({
                    success: true,
                    orders: [],
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
            }

            case 'tickets': {
                const { page = 1, limit = 50, status } = data;
                // In production: fetch tickets from database
                return res.status(200).json({
                    success: true,
                    tickets: [],
                    total: 0
                });
            }

            case 'settings': {
                // In production: fetch/update settings from database
                const { get, set } = data;

                if (get) {
                    return res.status(200).json({
                        success: true,
                        settings: {
                            phpRate: 56,
                            profitMultiplier: 2.5,
                            minDeposit: 50,
                            gcashNumber: '',
                            mayaNumber: '',
                            messengerLink: ''
                        }
                    });
                }

                if (set) {
                    // In production: validate and save settings
                    return res.status(200).json({
                        success: true,
                        message: 'Settings updated'
                    });
                }

                return res.status(400).json({ error: 'Specify get or set' });
            }

            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Admin API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
