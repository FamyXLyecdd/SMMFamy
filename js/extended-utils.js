/**
 * SMMFamy - Extended Utilities Library
 * Additional utility functions and helpers | ~600 lines
 */

const ExtendedUtils = {
    // ============================================
    // STRING UTILITIES
    // ============================================

    /**
     * Convert string to slug format
     */
    slugify(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    /**
     * Capitalize first letter of each word
     */
    titleCase(str) {
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },

    /**
     * Convert camelCase to kebab-case
     */
    camelToKebab(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    },

    /**
     * Convert kebab-case to camelCase
     */
    kebabToCamel(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    },

    /**
     * Truncate string with ellipsis
     */
    truncate(str, length = 50, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.substring(0, length - suffix.length) + suffix;
    },

    /**
     * Truncate from middle
     */
    truncateMiddle(str, maxLength = 20, separator = '...') {
        if (!str || str.length <= maxLength) return str;
        const charsToShow = maxLength - separator.length;
        const frontChars = Math.ceil(charsToShow / 2);
        const backChars = Math.floor(charsToShow / 2);
        return str.substring(0, frontChars) + separator + str.substring(str.length - backChars);
    },

    /**
     * Extract hashtags from string
     */
    extractHashtags(str) {
        const regex = /#(\w+)/g;
        const matches = [];
        let match;
        while ((match = regex.exec(str)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    },

    /**
     * Extract mentions from string
     */
    extractMentions(str) {
        const regex = /@(\w+)/g;
        const matches = [];
        let match;
        while ((match = regex.exec(str)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    },

    /**
     * Extract URLs from string
     */
    extractUrls(str) {
        const regex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
        return str.match(regex) || [];
    },

    /**
     * Remove HTML tags from string
     */
    stripHtml(str) {
        return str.replace(/<[^>]*>/g, '');
    },

    /**
     * Convert newlines to BR tags
     */
    nl2br(str) {
        return str.replace(/\n/g, '<br>');
    },

    /**
     * Generate random string
     */
    randomString(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Pad string with character
     */
    padStart(str, length, char = '0') {
        str = String(str);
        while (str.length < length) {
            str = char + str;
        }
        return str;
    },

    /**
     * Reverse a string
     */
    reverse(str) {
        return str.split('').reverse().join('');
    },

    /**
     * Count words in string
     */
    wordCount(str) {
        return str.trim().split(/\s+/).filter(Boolean).length;
    },

    /**
     * Count characters in string (excluding spaces)
     */
    charCount(str, excludeSpaces = true) {
        if (excludeSpaces) {
            return str.replace(/\s/g, '').length;
        }
        return str.length;
    },

    // ============================================
    // NUMBER UTILITIES
    // ============================================

    /**
     * Clamp number between min and max
     */
    clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    },

    /**
     * Generate random number between min and max
     */
    randomBetween(min, max, decimal = false) {
        const num = Math.random() * (max - min) + min;
        return decimal ? num : Math.floor(num);
    },

    /**
     * Round to specific decimal places
     */
    round(num, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
    },

    /**
     * Format number with commas
     */
    formatWithCommas(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    },

    /**
     * Format percentage
     */
    formatPercent(value, decimals = 0) {
        return (value * 100).toFixed(decimals) + '%';
    },

    /**
     * Calculate percentage
     */
    percentage(part, whole) {
        if (whole === 0) return 0;
        return (part / whole) * 100;
    },

    /**
     * Check if number is even
     */
    isEven(num) {
        return num % 2 === 0;
    },

    /**
     * Check if number is odd
     */
    isOdd(num) {
        return num % 2 !== 0;
    },

    /**
     * Get ordinal suffix for number (1st, 2nd, 3rd, etc.)
     */
    ordinal(num) {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = num % 100;
        return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    },

    /**
     * Sum array of numbers
     */
    sum(arr) {
        return arr.reduce((a, b) => a + b, 0);
    },

    /**
     * Average of array of numbers
     */
    average(arr) {
        if (arr.length === 0) return 0;
        return this.sum(arr) / arr.length;
    },

    /**
     * Find median of array
     */
    median(arr) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    },

    // ============================================
    // ARRAY UTILITIES
    // ============================================

    /**
     * Get unique values from array
     */
    unique(arr) {
        return [...new Set(arr)];
    },

    /**
     * Chunk array into smaller arrays
     */
    chunk(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    },

    /**
     * Shuffle array (Fisher-Yates)
     */
    shuffle(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    /**
     * Get random item from array
     */
    randomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * Get random items from array
     */
    randomItems(arr, count) {
        const shuffled = this.shuffle(arr);
        return shuffled.slice(0, count);
    },

    /**
     * Remove duplicates by property
     */
    uniqueBy(arr, key) {
        const seen = new Set();
        return arr.filter(item => {
            const value = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        });
    },

    /**
     * Group array by property
     */
    groupBy(arr, key) {
        return arr.reduce((groups, item) => {
            const value = typeof key === 'function' ? key(item) : item[key];
            (groups[value] = groups[value] || []).push(item);
            return groups;
        }, {});
    },

    /**
     * Sort array by multiple properties
     */
    sortBy(arr, ...keys) {
        return [...arr].sort((a, b) => {
            for (const key of keys) {
                const desc = key.startsWith('-');
                const prop = desc ? key.slice(1) : key;
                const aVal = a[prop];
                const bVal = b[prop];
                if (aVal < bVal) return desc ? 1 : -1;
                if (aVal > bVal) return desc ? -1 : 1;
            }
            return 0;
        });
    },

    /**
     * Flatten nested array
     */
    flatten(arr, depth = Infinity) {
        return arr.flat(depth);
    },

    /**
     * Find difference between two arrays
     */
    difference(arr1, arr2) {
        const set = new Set(arr2);
        return arr1.filter(x => !set.has(x));
    },

    /**
     * Find intersection of two arrays
     */
    intersection(arr1, arr2) {
        const set = new Set(arr2);
        return arr1.filter(x => set.has(x));
    },

    /**
     * Partition array by condition
     */
    partition(arr, predicate) {
        const pass = [];
        const fail = [];
        arr.forEach(item => {
            (predicate(item) ? pass : fail).push(item);
        });
        return [pass, fail];
    },

    /**
     * Move array item to new index
     */
    move(arr, from, to) {
        const copy = [...arr];
        const item = copy.splice(from, 1)[0];
        copy.splice(to, 0, item);
        return copy;
    },

    // ============================================
    // OBJECT UTILITIES
    // ============================================

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Object) {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
    },

    /**
     * Deep merge objects
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    },

    /**
     * Check if value is plain object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    },

    /**
     * Pick specific keys from object
     */
    pick(obj, keys) {
        return keys.reduce((result, key) => {
            if (obj.hasOwnProperty(key)) {
                result[key] = obj[key];
            }
            return result;
        }, {});
    },

    /**
     * Omit specific keys from object
     */
    omit(obj, keys) {
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
    },

    /**
     * Get nested value from object
     */
    get(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;
        for (const key of keys) {
            if (result === null || result === undefined) return defaultValue;
            result = result[key];
        }
        return result === undefined ? defaultValue : result;
    },

    /**
     * Set nested value in object
     */
    set(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return obj;
    },

    /**
     * Check if object is empty
     */
    isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },

    /**
     * Invert object keys and values
     */
    invert(obj) {
        return Object.entries(obj).reduce((result, [key, value]) => {
            result[value] = key;
            return result;
        }, {});
    },

    // ============================================
    // DATE UTILITIES
    // ============================================

    /**
     * Check if date is today
     */
    isToday(date) {
        const today = new Date();
        const d = new Date(date);
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    },

    /**
     * Check if date is yesterday
     */
    isYesterday(date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const d = new Date(date);
        return d.getDate() === yesterday.getDate() &&
            d.getMonth() === yesterday.getMonth() &&
            d.getFullYear() === yesterday.getFullYear();
    },

    /**
     * Get days between two dates
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * Add days to date
     */
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    /**
     * Add hours to date
     */
    addHours(date, hours) {
        const result = new Date(date);
        result.setTime(result.getTime() + hours * 60 * 60 * 1000);
        return result;
    },

    /**
     * Get start of day
     */
    startOfDay(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    },

    /**
     * Get end of day
     */
    endOfDay(date) {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    },

    /**
     * Get start of month
     */
    startOfMonth(date) {
        const result = new Date(date);
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
        return result;
    },

    /**
     * Get end of month
     */
    endOfMonth(date) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + 1, 0);
        result.setHours(23, 59, 59, 999);
        return result;
    },

    /**
     * Check if date is in past
     */
    isPast(date) {
        return new Date(date) < new Date();
    },

    /**
     * Check if date is in future
     */
    isFuture(date) {
        return new Date(date) > new Date();
    },

    /**
     * Get week number of year
     */
    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    // ============================================
    // VALIDATION UTILITIES
    // ============================================

    /**
     * Validate phone number (Philippine format)
     */
    isPhoneNumber(str) {
        const regex = /^(09|\+639)\d{9}$/;
        return regex.test(str.replace(/[\s-]/g, ''));
    },

    /**
     * Validate email address
     */
    isEmail(str) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(str);
    },

    /**
     * Validate URL
     */
    isUrl(str) {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate IP address
     */
    isIpAddress(str) {
        const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return regex.test(str);
    },

    /**
     * Validate credit card number (Luhn algorithm)
     */
    isCreditCard(str) {
        const cleaned = str.replace(/\D/g, '');
        if (cleaned.length < 13 || cleaned.length > 19) return false;

        let sum = 0;
        let isEven = false;

        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned[i]);
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    },

    /**
     * Validate hex color
     */
    isHexColor(str) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(str);
    },

    /**
     * Validate JSON string
     */
    isJson(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate alphanumeric
     */
    isAlphanumeric(str) {
        return /^[a-zA-Z0-9]+$/.test(str);
    },

    /**
     * Validate number string
     */
    isNumeric(str) {
        return /^\d+$/.test(str);
    },

    // ============================================
    // COLOR UTILITIES
    // ============================================

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    /**
     * Convert RGB to hex
     */
    rgbToHex(r, g, b) {
        return '#' + [r, g, b]
            .map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            })
            .join('');
    },

    /**
     * Lighten color
     */
    lighten(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const r = Math.min(255, rgb.r + (255 - rgb.r) * percent);
        const g = Math.min(255, rgb.g + (255 - rgb.g) * percent);
        const b = Math.min(255, rgb.b + (255 - rgb.b) * percent);

        return this.rgbToHex(Math.round(r), Math.round(g), Math.round(b));
    },

    /**
     * Darken color
     */
    darken(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const r = Math.max(0, rgb.r * (1 - percent));
        const g = Math.max(0, rgb.g * (1 - percent));
        const b = Math.max(0, rgb.b * (1 - percent));

        return this.rgbToHex(Math.round(r), Math.round(g), Math.round(b));
    },

    /**
     * Get contrast color (black or white)
     */
    getContrastColor(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return '#000000';

        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#FFFFFF';
    },

    /**
     * Generate random color
     */
    randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }
};

// Export for use
window.ExtendedUtils = ExtendedUtils;
