/**
 * SMMFamy - Currency Helper
 * Currency formatting and conversion | ~200 lines
 */

const Currency = {
    defaultCurrency: 'PHP',
    rates: {},

    /**
     * Currency configurations
     */
    currencies: {
        PHP: { symbol: '₱', code: 'PHP', name: 'Philippine Peso', decimals: 2 },
        USD: { symbol: '$', code: 'USD', name: 'US Dollar', decimals: 2 },
        EUR: { symbol: '€', code: 'EUR', name: 'Euro', decimals: 2 },
        GBP: { symbol: '£', code: 'GBP', name: 'British Pound', decimals: 2 },
        JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen', decimals: 0 },
        KRW: { symbol: '₩', code: 'KRW', name: 'Korean Won', decimals: 0 },
        CNY: { symbol: '¥', code: 'CNY', name: 'Chinese Yuan', decimals: 2 },
        INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', decimals: 2 },
        BTC: { symbol: '₿', code: 'BTC', name: 'Bitcoin', decimals: 8 },
        USDT: { symbol: '$', code: 'USDT', name: 'Tether', decimals: 2 }
    },

    /**
     * Mock exchange rates (PHP base)
     */
    exchangeRates: {
        PHP: 1,
        USD: 0.018,
        EUR: 0.016,
        GBP: 0.014,
        JPY: 2.5,
        KRW: 23.5,
        CNY: 0.13,
        INR: 1.5,
        BTC: 0.00000035,
        USDT: 0.018
    },

    /**
     * Format currency
     */
    format(amount, currency = null, options = {}) {
        currency = currency || this.defaultCurrency;
        const config = this.currencies[currency] || this.currencies.PHP;

        const defaults = {
            showSymbol: true,
            showCode: false,
            decimals: config.decimals,
            thousand: ','
        };

        const opts = { ...defaults, ...options };

        // Format number
        const num = parseFloat(amount) || 0;
        const formatted = num.toFixed(opts.decimals)
            .replace(/\B(?=(\d{3})+(?!\d))/g, opts.thousand);

        // Build output
        let output = '';
        if (opts.showSymbol) output += config.symbol;
        output += formatted;
        if (opts.showCode) output += ` ${config.code}`;

        return output;
    },

    /**
     * Format with abbreviated units
     */
    formatShort(amount, currency = null) {
        currency = currency || this.defaultCurrency;
        const config = this.currencies[currency] || this.currencies.PHP;
        const num = parseFloat(amount) || 0;

        if (num >= 1000000000) {
            return config.symbol + (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return config.symbol + (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return config.symbol + (num / 1000).toFixed(1) + 'K';
        }

        return this.format(num, currency);
    },

    /**
     * Convert between currencies
     */
    convert(amount, from, to) {
        from = from || this.defaultCurrency;
        to = to || this.defaultCurrency;

        if (from === to) return amount;

        const fromRate = this.exchangeRates[from] || 1;
        const toRate = this.exchangeRates[to] || 1;

        // Convert to PHP then to target
        const phpAmount = amount / fromRate;
        return phpAmount * toRate;
    },

    /**
     * Parse currency string to number
     */
    parse(value) {
        if (typeof value === 'number') return value;

        // Remove currency symbols and spaces
        const cleaned = value.replace(/[₱$€£¥₩₹₿\s,]/g, '');
        return parseFloat(cleaned) || 0;
    },

    /**
     * Set default currency
     */
    setDefault(currency) {
        if (this.currencies[currency]) {
            this.defaultCurrency = currency;
            Storage.set('preferred_currency', currency);
        }
    },

    /**
     * Get currency symbol
     */
    getSymbol(currency = null) {
        currency = currency || this.defaultCurrency;
        return this.currencies[currency]?.symbol || '₱';
    },

    /**
     * Get all available currencies
     */
    getAll() {
        return Object.values(this.currencies);
    },

    /**
     * Calculate percentage
     */
    percentage(amount, percent) {
        return (parseFloat(amount) || 0) * (parseFloat(percent) || 0) / 100;
    },

    /**
     * Add percentage
     */
    addPercentage(amount, percent) {
        return parseFloat(amount) + this.percentage(amount, percent);
    },

    /**
     * Calculate discount
     */
    discount(amount, discountPercent) {
        const discount = this.percentage(amount, discountPercent);
        return {
            original: parseFloat(amount),
            discount: discount,
            final: parseFloat(amount) - discount
        };
    },

    /**
     * Format price range
     */
    formatRange(min, max, currency = null) {
        return `${this.format(min, currency)} - ${this.format(max, currency)}`;
    },

    /**
     * Format price per unit
     */
    formatRate(price, unit = 1000, currency = null) {
        return `${this.format(price, currency)}/${unit.toLocaleString()}`;
    },

    /**
     * Calculate order total
     */
    calculateTotal(quantity, ratePerThousand) {
        return (quantity / 1000) * ratePerThousand;
    }
};

// Load saved preference
if (typeof Storage !== 'undefined' && Storage.get) {
    const saved = Storage.get('preferred_currency');
    if (saved && Currency.currencies[saved]) {
        Currency.defaultCurrency = saved;
    }
}

// Export
window.Currency = Currency;
