/**
 * SMMFamy - User/Balance API
 * Vercel Serverless Function
 * Handles: get profile, update profile, balance operations
 */

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'smmfamy-secret-key-change-in-production';

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

function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, 500);
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

    const { action, ...data } = req.body;

    try {
        switch (action) {
            case 'profile': {
                // In production: fetch user from database
                return res.status(200).json({
                    success: true,
                    user: {
                        id: user.userId,
                        email: user.email,
                        role: user.role,
                        // Add more fields from database
                    }
                });
            }

            case 'update_profile': {
                const { name, phone } = data;

                // In production: update user in database
                return res.status(200).json({
                    success: true,
                    message: 'Profile updated successfully',
                    user: {
                        id: user.userId,
                        name: sanitizeInput(name),
                        phone: sanitizeInput(phone)
                    }
                });
            }

            case 'change_password': {
                const { currentPassword, newPassword } = data;

                if (!currentPassword || !newPassword) {
                    return res.status(400).json({ error: 'Both passwords required' });
                }

                if (newPassword.length < 6) {
                    return res.status(400).json({ error: 'New password must be at least 6 characters' });
                }

                // In production: verify current password and update in database
                return res.status(200).json({
                    success: true,
                    message: 'Password changed successfully'
                });
            }

            case 'balance': {
                // In production: fetch balance from database
                return res.status(200).json({
                    success: true,
                    balance: 0, // Fetch from DB
                    currency: 'PHP'
                });
            }

            case 'add_funds': {
                // This should be handled by admin after manual payment verification
                // Regular users can only request to add funds
                const { amount, paymentMethod, transactionRef } = data;

                if (!amount || amount < 50) {
                    return res.status(400).json({ error: 'Minimum amount is ₱50' });
                }

                // Create pending payment request
                // In production: save to database
                const paymentRequest = {
                    id: 'pay_' + crypto.randomBytes(8).toString('hex'),
                    userId: user.userId,
                    amount: parseFloat(amount),
                    method: sanitizeInput(paymentMethod),
                    reference: sanitizeInput(transactionRef),
                    status: 'pending',
                    createdAt: new Date().toISOString()
                };

                return res.status(200).json({
                    success: true,
                    message: 'Payment request submitted. Please send your payment proof.',
                    request: paymentRequest
                });
            }

            case 'transactions': {
                // In production: fetch transactions from database
                return res.status(200).json({
                    success: true,
                    transactions: []
                });
            }

            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('User API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
