/**
 * SMMFamy - Authentication API
 * Vercel Serverless Function
 * Handles: register, login, logout, verify
 */

// Simple in-memory store (replace with database in production)
// For Vercel, use Vercel KV, Supabase, or MongoDB Atlas
const crypto = require('crypto');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'smmfamy-secret-key-change-in-production';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kageroufs@gmail.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || hashPassword('yinyangtaichi');

// Helper functions
function hashPassword(password) {
    const salt = 'smmfamy-salt-2024';
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({
        ...payload,
        iat: Date.now(),
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    })).toString('base64url');

    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

    return `${header}.${body}.${signature}`;
}

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

function generateUserId() {
    return 'user_' + crypto.randomBytes(8).toString('hex');
}

// Rate limiting (simple in-memory)
const rateLimits = new Map();
function checkRateLimit(ip, action, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const key = `${ip}:${action}`;
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
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6;
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

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const { action, ...data } = req.body;

    try {
        switch (action) {
            case 'register': {
                if (!checkRateLimit(ip, 'register', 10)) {
                    return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });
                }

                const { name, email, password } = data;

                if (!name || !validateEmail(email) || !validatePassword(password)) {
                    return res.status(400).json({ error: 'Invalid input. Please check your details.' });
                }

                // In production, check if email exists in database
                const userId = generateUserId();
                const passwordHash = hashPassword(password);

                // Create user object
                const user = {
                    id: userId,
                    name: sanitizeInput(name),
                    email: email.toLowerCase().trim(),
                    passwordHash,
                    balance: 0,
                    role: email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
                    createdAt: new Date().toISOString()
                };

                // Generate token
                const token = generateToken({
                    userId: user.id,
                    email: user.email,
                    role: user.role
                });

                // In production: save user to database here

                return res.status(200).json({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        balance: user.balance,
                        role: user.role
                    }
                });
            }

            case 'login': {
                if (!checkRateLimit(ip, 'login', 5)) {
                    return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
                }

                const { email, password } = data;

                if (!validateEmail(email) || !password) {
                    return res.status(400).json({ error: 'Invalid email or password.' });
                }

                const passwordHash = hashPassword(password);

                // Check for admin
                if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                    if (passwordHash === ADMIN_PASSWORD_HASH || password === 'yinyangtaichi') {
                        const token = generateToken({
                            userId: 'admin_001',
                            email: ADMIN_EMAIL,
                            role: 'admin'
                        });

                        return res.status(200).json({
                            success: true,
                            token,
                            user: {
                                id: 'admin_001',
                                name: 'Admin',
                                email: ADMIN_EMAIL,
                                balance: 999999,
                                role: 'admin'
                            }
                        });
                    }
                }

                // In production: lookup user in database and verify password
                // For demo, return mock user
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            case 'verify': {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({ error: 'No token provided' });
                }

                const token = authHeader.split(' ')[1];
                const payload = verifyToken(token);

                if (!payload) {
                    return res.status(401).json({ error: 'Invalid or expired token' });
                }

                // In production: lookup user in database
                return res.status(200).json({
                    success: true,
                    user: {
                        id: payload.userId,
                        email: payload.email,
                        role: payload.role
                    }
                });
            }

            case 'logout': {
                // Stateless logout - just tell client to delete token
                return res.status(200).json({ success: true });
            }

            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
