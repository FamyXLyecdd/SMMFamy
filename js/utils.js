/**
 * SMMFamy - Utility Functions
 * Common helper functions | ~300 lines
 */

const Utils = {
    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @param {string} symbol - Currency symbol (default: P)
     */
    formatCurrency(amount, symbol = 'P') {
        const num = parseFloat(amount) || 0;
        return symbol + num.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    /**
     * Format number with commas
     */
    formatNumber(num, decimals = 0) {
        return parseFloat(num).toLocaleString('en-PH', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    /**
     * Format number in compact form (1K, 1M, etc.)
     */
    formatCompact(num) {
        const n = parseFloat(num);
        if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    },

    /**
     * Format date
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);

        if (format === 'short') {
            return d.toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }

        if (format === 'long') {
            return d.toLocaleDateString('en-PH', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        }

        if (format === 'time') {
            return d.toLocaleTimeString('en-PH', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        if (format === 'datetime') {
            return d.toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return d.toISOString();
    },

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(date) {
        const now = Date.now();
        const then = new Date(date).getTime();
        const diff = now - then;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        if (weeks < 4) return `${weeks}w ago`;
        if (months < 12) return `${months}mo ago`;
        return `${years}y ago`;
    },

    /**
     * Truncate string
     */
    truncate(str, length = 50, suffix = '...') {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length).trim() + suffix;
    },

    /**
     * Truncate URL for display
     */
    truncateUrl(url, length = 40) {
        if (!url) return '';
        // Remove protocol
        let display = url.replace(/^https?:\/\//, '');
        // Remove www
        display = display.replace(/^www\./, '');
        return this.truncate(display, length);
    },

    /**
     * Validate URL
     */
    isValidUrl(str) {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate email
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Generate unique ID
     */
    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return prefix + timestamp + random;
    },

    /**
     * Generate order ID
     */
    generateOrderId() {
        const num = Math.floor(Math.random() * 900000) + 100000;
        return 'ORD-' + num;
    },

    /**
     * Generate transaction ID
     */
    generateTxnId() {
        const num = Math.floor(Math.random() * 9000000) + 1000000;
        return 'TXN-' + num;
    },

    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof structuredClone === 'function') {
            return structuredClone(obj);
        }
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Sleep / delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Copy to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    },

    /**
     * Parse query string
     */
    parseQueryString(str = window.location.search) {
        const params = new URLSearchParams(str);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    /**
     * Build query string
     */
    buildQueryString(params) {
        return new URLSearchParams(params).toString();
    },

    /**
     * Escape HTML
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Get initials from name
     */
    getInitials(name, count = 2) {
        if (!name) return '';
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, count)
            .join('');
    },

    /**
     * Get Gravatar URL
     */
    getGravatarUrl(email, size = 80) {
        const hash = this.simpleHash(email.toLowerCase().trim());
        return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
    },

    /**
     * Simple string hash
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(32, '0');
    },

    /**
     * Check password strength
     */
    getPasswordStrength(password) {
        let score = 0;

        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 1) return { level: 'weak', text: 'Weak', color: 'error' };
        if (score <= 2) return { level: 'fair', text: 'Fair', color: 'warning' };
        if (score <= 3) return { level: 'good', text: 'Good', color: 'success' };
        return { level: 'strong', text: 'Strong', color: 'success' };
    },

    /**
     * Animate counting number
     */
    animateCounter(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);

            element.textContent = this.formatNumber(current);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = this.formatNumber(target);
            }
        };

        requestAnimationFrame(step);
    },

    /**
     * Check if element is in viewport
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Scroll to element
     */
    scrollTo(element, offset = 0) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    },

    /**
     * Get platform from URL
     */
    getPlatformFromUrl(url) {
        if (!url) return null;
        const lower = url.toLowerCase();

        if (lower.includes('instagram.com')) return 'Instagram';
        if (lower.includes('tiktok.com')) return 'TikTok';
        if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
        if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'Facebook';
        if (lower.includes('twitter.com') || lower.includes('x.com')) return 'Twitter';
        if (lower.includes('t.me') || lower.includes('telegram')) return 'Telegram';
        if (lower.includes('discord')) return 'Discord';
        if (lower.includes('spotify')) return 'Spotify';
        if (lower.includes('twitch')) return 'Twitch';
        if (lower.includes('linkedin')) return 'LinkedIn';

        return 'Other';
    }
};

// Export for use
window.Utils = Utils;
