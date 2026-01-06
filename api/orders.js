/**
 * SMMFamy - Orders API
 * Vercel Serverless Function
 * Handles: create order, get orders, order status, refill
 */

const crypto = require('crypto');

// SMMGen API Configuration
const SMMGEN_API_URL = 'https://smmgen.com/api/v2';
const SMMGEN_API_KEY = process.env.SMMGEN_API_KEY || 'c4bef138daa72a2bdf56ab47edb55ef5';

// JWT verification
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

// Rate limiting
const rateLimits = new Map();
function checkRateLimit(userId, action, maxAttempts = 30, windowMs = 60 * 1000) {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const limits = rateLimits.get(key) || { attempts: 0, firstAttempt: now };

    if (now - limits.firstAttempt > windowMs) {
        limits.attempts = 1;
        limits.firstAttempt = now;
    } else {
        limits.attempts++;
    }

    rateLimits.set(key, limits);
    return limits.attempts <= maxAttempts;
}

// Validation
function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, 1000);
}

// SMMGen API request
async function smmgenRequest(action, params = {}) {
    const formData = new URLSearchParams();
    formData.append('key', SMMGEN_API_KEY);
    formData.append('action', action);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value);
        }
    });

    const response = await fetch(SMMGEN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
    });

    return response.json();
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
            case 'create': {
                // Rate limit order creation
                if (!checkRateLimit(user.userId, 'create_order', 10, 60000)) {
                    return res.status(429).json({ error: 'Too many orders. Please wait.' });
                }

                const { service, link, quantity } = data;

                // Validate input
                if (!service || !link || !quantity) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                if (!validateUrl(link)) {
                    return res.status(400).json({ error: 'Invalid link format' });
                }

                const qty = parseInt(quantity);
                if (isNaN(qty) || qty < 1) {
                    return res.status(400).json({ error: 'Invalid quantity' });
                }

                // In production: check user balance first
                // Place order via SMMGen
                const result = await smmgenRequest('add', {
                    service: service,
                    link: sanitizeInput(link),
                    quantity: qty
                });

                if (result.error) {
                    return res.status(400).json({ error: result.error });
                }

                // In production: save order to database, deduct balance
                return res.status(200).json({
                    success: true,
                    order: result.order,
                    message: 'Order placed successfully'
                });
            }

            case 'status': {
                const { orderId } = data;

                if (!orderId) {
                    return res.status(400).json({ error: 'Order ID required' });
                }

                const result = await smmgenRequest('status', { order: orderId });

                if (result.error) {
                    return res.status(400).json({ error: result.error });
                }

                return res.status(200).json({
                    success: true,
                    ...result
                });
            }

            case 'refill': {
                if (!checkRateLimit(user.userId, 'refill', 5, 60000)) {
                    return res.status(429).json({ error: 'Too many refill requests. Please wait.' });
                }

                const { orderId } = data;

                if (!orderId) {
                    return res.status(400).json({ error: 'Order ID required' });
                }

                const result = await smmgenRequest('refill', { order: orderId });

                if (result.error) {
                    return res.status(400).json({ error: result.error });
                }

                return res.status(200).json({
                    success: true,
                    refill: result.refill,
                    message: 'Refill request submitted'
                });
            }

            case 'cancel': {
                const { orderId } = data;

                if (!orderId) {
                    return res.status(400).json({ error: 'Order ID required' });
                }

                const result = await smmgenRequest('cancel', { orders: orderId });

                return res.status(200).json({
                    success: true,
                    ...result
                });
            }

            case 'list': {
                // In production: fetch user's orders from database
                // For now, return empty array (orders stored client-side)
                return res.status(200).json({
                    success: true,
                    orders: []
                });
            }

            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Orders error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
