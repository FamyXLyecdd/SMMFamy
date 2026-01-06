/**
 * SMMFamy - Tickets/Support API
 * Vercel Serverless Function
 * Handles: create ticket, get tickets, reply, close
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

function sanitizeInput(str, maxLen = 1000) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLen);
}

function generateId(prefix) {
    return `${prefix}_` + crypto.randomBytes(8).toString('hex');
}

// Rate limiting
const rateLimits = new Map();
function checkRateLimit(userId, action, max = 10, windowMs = 60000) {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const limits = rateLimits.get(key) || { attempts: 0, first: now };

    if (now - limits.first > windowMs) {
        limits.attempts = 1;
        limits.first = now;
    } else {
        limits.attempts++;
    }

    rateLimits.set(key, limits);
    return limits.attempts <= max;
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
                if (!checkRateLimit(user.userId, 'create_ticket', 5)) {
                    return res.status(429).json({ error: 'Too many tickets. Please wait.' });
                }

                const { subject, category, message, orderId } = data;

                if (!subject || !message) {
                    return res.status(400).json({ error: 'Subject and message required' });
                }

                const ticket = {
                    id: generateId('tkt'),
                    userId: user.userId,
                    subject: sanitizeInput(subject, 200),
                    category: sanitizeInput(category, 50) || 'General',
                    orderId: orderId ? sanitizeInput(orderId, 50) : null,
                    status: 'open',
                    priority: 'normal',
                    messages: [{
                        id: generateId('msg'),
                        userId: user.userId,
                        message: sanitizeInput(message, 2000),
                        isAdmin: false,
                        createdAt: new Date().toISOString()
                    }],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // In production: save to database
                return res.status(200).json({
                    success: true,
                    message: 'Ticket created successfully',
                    ticket
                });
            }

            case 'list': {
                // In production: fetch user's tickets from database
                return res.status(200).json({
                    success: true,
                    tickets: []
                });
            }

            case 'get': {
                const { ticketId } = data;

                if (!ticketId) {
                    return res.status(400).json({ error: 'Ticket ID required' });
                }

                // In production: fetch ticket from database
                // Verify ticket belongs to user or user is admin
                return res.status(200).json({
                    success: true,
                    ticket: null
                });
            }

            case 'reply': {
                if (!checkRateLimit(user.userId, 'ticket_reply', 20)) {
                    return res.status(429).json({ error: 'Too many replies. Please wait.' });
                }

                const { ticketId, message } = data;

                if (!ticketId || !message) {
                    return res.status(400).json({ error: 'Ticket ID and message required' });
                }

                const reply = {
                    id: generateId('msg'),
                    userId: user.userId,
                    message: sanitizeInput(message, 2000),
                    isAdmin: user.role === 'admin',
                    createdAt: new Date().toISOString()
                };

                // In production: add reply to ticket in database
                return res.status(200).json({
                    success: true,
                    message: 'Reply added',
                    reply
                });
            }

            case 'close': {
                const { ticketId } = data;

                if (!ticketId) {
                    return res.status(400).json({ error: 'Ticket ID required' });
                }

                // In production: update ticket status in database
                return res.status(200).json({
                    success: true,
                    message: 'Ticket closed'
                });
            }

            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Tickets API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
