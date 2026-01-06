/**
 * SMMFamy - Form Validation System
 * Advanced form validation with real-time feedback | ~500 lines
 */

const FormValidator = {
    // Common validation rules
    rules: {
        required: {
            validate: value => value !== null && value !== undefined && value.toString().trim() !== '',
            message: 'This field is required'
        },
        email: {
            validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            message: 'Please enter a valid email address'
        },
        url: {
            validate: value => {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            message: 'Please enter a valid URL'
        },
        phone: {
            validate: value => /^(09|\+639)\d{9}$/.test(value.replace(/[\s-]/g, '')),
            message: 'Please enter a valid phone number'
        },
        minLength: {
            validate: (value, min) => value.length >= min,
            message: min => `Must be at least ${min} characters`
        },
        maxLength: {
            validate: (value, max) => value.length <= max,
            message: max => `Must be no more than ${max} characters`
        },
        min: {
            validate: (value, min) => parseFloat(value) >= min,
            message: min => `Must be at least ${min}`
        },
        max: {
            validate: (value, max) => parseFloat(value) <= max,
            message: max => `Must be no more than ${max}`
        },
        pattern: {
            validate: (value, pattern) => new RegExp(pattern).test(value),
            message: 'Invalid format'
        },
        numeric: {
            validate: value => /^\d+$/.test(value),
            message: 'Must contain only numbers'
        },
        alpha: {
            validate: value => /^[a-zA-Z]+$/.test(value),
            message: 'Must contain only letters'
        },
        alphanumeric: {
            validate: value => /^[a-zA-Z0-9]+$/.test(value),
            message: 'Must contain only letters and numbers'
        },
        match: {
            validate: (value, fieldName) => {
                const matchField = document.querySelector(`[name="${fieldName}"]`);
                return matchField && value === matchField.value;
            },
            message: fieldName => `Must match ${fieldName}`
        },
        instagram: {
            validate: value => /^https?:\/\/(www\.)?instagram\.com\/.+/.test(value),
            message: 'Please enter a valid Instagram URL'
        },
        tiktok: {
            validate: value => /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\/.+/.test(value),
            message: 'Please enter a valid TikTok URL'
        },
        youtube: {
            validate: value => /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(value),
            message: 'Please enter a valid YouTube URL'
        },
        facebook: {
            validate: value => /^https?:\/\/(www\.|m\.)?facebook\.com\/.+/.test(value),
            message: 'Please enter a valid Facebook URL'
        },
        twitter: {
            validate: value => /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/.test(value),
            message: 'Please enter a valid Twitter/X URL'
        },
        password: {
            validate: value => {
                const hasLength = value.length >= 8;
                const hasUpper = /[A-Z]/.test(value);
                const hasLower = /[a-z]/.test(value);
                const hasNumber = /[0-9]/.test(value);
                return hasLength && hasUpper && hasLower && hasNumber;
            },
            message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
        }
    },

    /**
     * Create validator instance for a form
     */
    create(formElement, options = {}) {
        const defaults = {
            validateOnBlur: true,
            validateOnInput: true,
            showSuccessState: true,
            scrollToError: true,
            errorClass: 'form-error',
            successClass: 'form-success',
            inputErrorClass: 'has-error',
            inputSuccessClass: 'has-success'
        };

        const config = { ...defaults, ...options };
        const form = typeof formElement === 'string'
            ? document.querySelector(formElement)
            : formElement;

        if (!form) {
            console.error('Form not found');
            return null;
        }

        const validator = {
            form,
            config,
            fields: new Map(),
            errors: new Map(),

            /**
             * Add field validation
             */
            addField(name, rules = []) {
                this.fields.set(name, rules);

                const field = form.querySelector(`[name="${name}"]`);
                if (field) {
                    if (config.validateOnBlur) {
                        field.addEventListener('blur', () => this.validateField(name));
                    }
                    if (config.validateOnInput) {
                        field.addEventListener('input', Utils.debounce(() => {
                            this.validateField(name);
                        }, 300));
                    }
                }

                return this;
            },

            /**
             * Validate single field
             */
            validateField(name) {
                const rules = this.fields.get(name);
                if (!rules) return true;

                const field = form.querySelector(`[name="${name}"]`);
                if (!field) return true;

                const value = field.value;
                const fieldErrors = [];

                for (const rule of rules) {
                    let ruleName, ruleParam;

                    if (typeof rule === 'string') {
                        ruleName = rule;
                    } else if (typeof rule === 'object') {
                        ruleName = rule.rule;
                        ruleParam = rule.param;
                    }

                    const ruleConfig = FormValidator.rules[ruleName];
                    if (!ruleConfig) continue;

                    // Skip validation if field is empty and not required
                    if (!value && ruleName !== 'required') continue;

                    const isValid = ruleParam
                        ? ruleConfig.validate(value, ruleParam)
                        : ruleConfig.validate(value);

                    if (!isValid) {
                        const message = typeof ruleConfig.message === 'function'
                            ? ruleConfig.message(ruleParam)
                            : rule.message || ruleConfig.message;
                        fieldErrors.push(message);
                    }
                }

                this.errors.set(name, fieldErrors);
                this.updateFieldUI(name);

                return fieldErrors.length === 0;
            },

            /**
             * Update field UI state
             */
            updateFieldUI(name) {
                const field = form.querySelector(`[name="${name}"]`);
                if (!field) return;

                const wrapper = field.closest('.form-group') || field.parentElement;
                const existingError = wrapper.querySelector(`.${config.errorClass}`);
                const fieldErrors = this.errors.get(name) || [];

                // Remove existing error/success states
                field.classList.remove(config.inputErrorClass, config.inputSuccessClass);
                if (existingError) existingError.remove();

                if (fieldErrors.length > 0) {
                    // Show error state
                    field.classList.add(config.inputErrorClass);

                    const errorElement = document.createElement('div');
                    errorElement.className = config.errorClass;
                    errorElement.textContent = fieldErrors[0];
                    wrapper.appendChild(errorElement);
                } else if (config.showSuccessState && field.value) {
                    // Show success state
                    field.classList.add(config.inputSuccessClass);
                }
            },

            /**
             * Validate all fields
             */
            validate() {
                let isValid = true;
                let firstError = null;

                for (const [name] of this.fields) {
                    const fieldValid = this.validateField(name);
                    if (!fieldValid && isValid) {
                        isValid = false;
                        firstError = name;
                    }
                }

                if (!isValid && config.scrollToError && firstError) {
                    const field = form.querySelector(`[name="${firstError}"]`);
                    if (field) {
                        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        field.focus();
                    }
                }

                return isValid;
            },

            /**
             * Get all errors
             */
            getErrors() {
                const allErrors = {};
                for (const [name, errors] of this.errors) {
                    if (errors.length > 0) {
                        allErrors[name] = errors;
                    }
                }
                return allErrors;
            },

            /**
             * Clear all errors
             */
            clearErrors() {
                this.errors.clear();
                for (const [name] of this.fields) {
                    const field = form.querySelector(`[name="${name}"]`);
                    if (field) {
                        const wrapper = field.closest('.form-group') || field.parentElement;
                        const existingError = wrapper.querySelector(`.${config.errorClass}`);
                        if (existingError) existingError.remove();
                        field.classList.remove(config.inputErrorClass, config.inputSuccessClass);
                    }
                }
            },

            /**
             * Reset form and validation state
             */
            reset() {
                form.reset();
                this.clearErrors();
            },

            /**
             * Get form data as object
             */
            getData() {
                const formData = new FormData(form);
                const data = {};
                for (const [key, value] of formData.entries()) {
                    data[key] = value;
                }
                return data;
            },

            /**
             * Set form data from object
             */
            setData(data) {
                for (const [key, value] of Object.entries(data)) {
                    const field = form.querySelector(`[name="${key}"]`);
                    if (field) {
                        if (field.type === 'checkbox') {
                            field.checked = !!value;
                        } else if (field.type === 'radio') {
                            const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                            if (radio) radio.checked = true;
                        } else {
                            field.value = value;
                        }
                    }
                }
            },

            /**
             * Handle form submit
             */
            onSubmit(callback) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    if (this.validate()) {
                        const data = this.getData();
                        await callback(data, form);
                    }
                });

                return this;
            }
        };

        return validator;
    },

    /**
     * Quick validate a single value
     */
    validate(value, rules) {
        const errors = [];

        for (const rule of rules) {
            let ruleName, ruleParam;

            if (typeof rule === 'string') {
                ruleName = rule;
            } else if (typeof rule === 'object') {
                ruleName = rule.rule;
                ruleParam = rule.param;
            }

            const ruleConfig = this.rules[ruleName];
            if (!ruleConfig) continue;

            if (!value && ruleName !== 'required') continue;

            const isValid = ruleParam
                ? ruleConfig.validate(value, ruleParam)
                : ruleConfig.validate(value);

            if (!isValid) {
                const message = typeof ruleConfig.message === 'function'
                    ? ruleConfig.message(ruleParam)
                    : rule.message || ruleConfig.message;
                errors.push(message);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Add custom validation rule
     */
    addRule(name, validate, message) {
        this.rules[name] = { validate, message };
    }
};

// Export for use
window.FormValidator = FormValidator;
