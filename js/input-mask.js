/**
 * SMMFamy - Input Masks
 * Format inputs as user types | ~300 lines
 */

const InputMask = {
    masks: {},

    /**
     * Apply mask to input
     */
    apply(input, maskType) {
        if (typeof input === 'string') {
            input = document.getElementById(input);
        }

        if (!input) return;

        const maskFn = this.getMaskFunction(maskType);
        if (!maskFn) return;

        input.addEventListener('input', (e) => {
            const cursorPos = e.target.selectionStart;
            const oldLength = e.target.value.length;

            e.target.value = maskFn(e.target.value);

            const newLength = e.target.value.length;
            const newPos = cursorPos + (newLength - oldLength);

            // Restore cursor position
            e.target.setSelectionRange(newPos, newPos);
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            input.value = maskFn(paste);
        });
    },

    /**
     * Get mask function by type
     */
    getMaskFunction(type) {
        switch (type) {
            case 'phone':
                return this.phoneMask;
            case 'phone-ph':
                return this.phonePhMask;
            case 'credit-card':
                return this.creditCardMask;
            case 'expiry':
                return this.expiryMask;
            case 'cvv':
                return this.cvvMask;
            case 'currency':
                return this.currencyMask;
            case 'currency-php':
                return this.currencyPhpMask;
            case 'number':
                return this.numberMask;
            case 'date':
                return this.dateMask;
            case 'time':
                return this.timeMask;
            case 'uppercase':
                return (v) => v.toUpperCase();
            case 'lowercase':
                return (v) => v.toLowerCase();
            case 'alphanumeric':
                return (v) => v.replace(/[^a-zA-Z0-9]/g, '');
            case 'letters':
                return (v) => v.replace(/[^a-zA-Z\s]/g, '');
            case 'digits':
                return (v) => v.replace(/\D/g, '');
            default:
                return this.masks[type] || null;
        }
    },

    /**
     * Register custom mask
     */
    register(name, maskFn) {
        this.masks[name] = maskFn;
    },

    /**
     * Phone mask (US format)
     */
    phoneMask(value) {
        const digits = value.replace(/\D/g, '');

        if (digits.length <= 3) {
            return digits;
        } else if (digits.length <= 6) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
        }
    },

    /**
     * Philippine phone mask
     */
    phonePhMask(value) {
        const digits = value.replace(/\D/g, '');

        if (digits.length <= 4) {
            return digits;
        } else if (digits.length <= 7) {
            return `${digits.slice(0, 4)} ${digits.slice(4)}`;
        } else {
            return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
        }
    },

    /**
     * Credit card mask
     */
    creditCardMask(value) {
        const digits = value.replace(/\D/g, '').slice(0, 16);
        const groups = digits.match(/.{1,4}/g) || [];
        return groups.join(' ');
    },

    /**
     * Expiry date mask
     */
    expiryMask(value) {
        const digits = value.replace(/\D/g, '').slice(0, 4);

        if (digits.length <= 2) {
            return digits;
        }

        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    },

    /**
     * CVV mask
     */
    cvvMask(value) {
        return value.replace(/\D/g, '').slice(0, 4);
    },

    /**
     * Currency mask (generic)
     */
    currencyMask(value) {
        // Remove non-numeric except decimal
        let num = value.replace(/[^\d.]/g, '');

        // Ensure only one decimal point
        const parts = num.split('.');
        if (parts.length > 2) {
            num = parts[0] + '.' + parts.slice(1).join('');
        }

        // Limit decimal places
        if (parts.length === 2) {
            num = parts[0] + '.' + parts[1].slice(0, 2);
        }

        // Add thousand separators
        if (parts[0]) {
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        return parts.length > 1 ? parts[0] + '.' + (parts[1] || '').slice(0, 2) : parts[0];
    },

    /**
     * PHP currency mask
     */
    currencyPhpMask(value) {
        const masked = InputMask.currencyMask(value.replace('₱', ''));
        return masked ? '₱' + masked : '';
    },

    /**
     * Number mask with thousand separators
     */
    numberMask(value) {
        const num = value.replace(/\D/g, '');
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Date mask (MM/DD/YYYY)
     */
    dateMask(value) {
        const digits = value.replace(/\D/g, '').slice(0, 8);

        if (digits.length <= 2) {
            return digits;
        } else if (digits.length <= 4) {
            return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        } else {
            return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        }
    },

    /**
     * Time mask (HH:MM)
     */
    timeMask(value) {
        const digits = value.replace(/\D/g, '').slice(0, 4);

        if (digits.length <= 2) {
            return digits;
        }

        return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    },

    /**
     * Get raw value (remove formatting)
     */
    getRaw(input, maskType) {
        if (typeof input === 'string') {
            input = document.getElementById(input);
        }

        if (!input) return '';

        const value = input.value;

        switch (maskType) {
            case 'phone':
            case 'phone-ph':
            case 'credit-card':
            case 'cvv':
            case 'number':
            case 'digits':
                return value.replace(/\D/g, '');
            case 'currency':
            case 'currency-php':
                return parseFloat(value.replace(/[^\d.]/g, '')) || 0;
            case 'date':
            case 'time':
            case 'expiry':
                return value.replace(/\D/g, '');
            default:
                return value;
        }
    },

    /**
     * Validate masked input
     */
    validate(input, maskType) {
        const raw = this.getRaw(input, maskType);

        switch (maskType) {
            case 'phone':
                return /^\d{10}$/.test(raw);
            case 'phone-ph':
                return /^09\d{9}$/.test(raw);
            case 'credit-card':
                return /^\d{16}$/.test(raw) && this.luhnCheck(raw);
            case 'expiry':
                if (raw.length !== 4) return false;
                const month = parseInt(raw.slice(0, 2));
                const year = parseInt('20' + raw.slice(2));
                const now = new Date();
                const expiry = new Date(year, month - 1);
                return month >= 1 && month <= 12 && expiry > now;
            case 'cvv':
                return /^\d{3,4}$/.test(raw);
            case 'date':
                if (raw.length !== 8) return false;
                const m = parseInt(raw.slice(0, 2));
                const d = parseInt(raw.slice(2, 4));
                const y = parseInt(raw.slice(4));
                return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900;
            case 'time':
                if (raw.length !== 4) return false;
                const h = parseInt(raw.slice(0, 2));
                const min = parseInt(raw.slice(2));
                return h >= 0 && h <= 23 && min >= 0 && min <= 59;
            default:
                return true;
        }
    },

    /**
     * Luhn algorithm for credit card validation
     */
    luhnCheck(cardNumber) {
        let sum = 0;
        let isEven = false;

        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    },

    /**
     * Auto-apply masks based on data attributes
     */
    init() {
        document.querySelectorAll('[data-mask]').forEach(input => {
            this.apply(input, input.dataset.mask);
        });
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => InputMask.init());
} else {
    InputMask.init();
}

// Export
window.InputMask = InputMask;
