/**
 * SMMFamy - Form Builder
 * Dynamic form generation | ~400 lines
 */

const FormBuilder = {
    /**
     * Build form from schema
     */
    build(schema, options = {}) {
        const config = {
            id: schema.id || 'form-' + Date.now(),
            method: 'POST',
            action: '',
            class: 'form-builder',
            submitText: 'Submit',
            cancelText: 'Cancel',
            showCancel: false,
            onSubmit: null,
            onCancel: null,
            validation: true,
            ...options
        };

        let html = `<form id="${config.id}" class="${config.class}" method="${config.method}" action="${config.action}">`;

        // Render fields
        if (schema.sections) {
            schema.sections.forEach(section => {
                html += this.renderSection(section);
            });
        } else if (schema.fields) {
            html += '<div class="form-fields">';
            schema.fields.forEach(field => {
                html += this.renderField(field);
            });
            html += '</div>';
        }

        // Actions
        html += `
            <div class="form-actions">
                ${config.showCancel ? `<button type="button" class="btn btn-secondary form-cancel">${config.cancelText}</button>` : ''}
                <button type="submit" class="btn btn-primary">${config.submitText}</button>
            </div>
        </form>`;

        return { html, config };
    },

    /**
     * Render section
     */
    renderSection(section) {
        let html = `<div class="form-section" id="section-${section.id || ''}">`;

        if (section.title) {
            html += `<h3 class="form-section-title">${section.title}</h3>`;
        }

        if (section.description) {
            html += `<p class="form-section-description">${section.description}</p>`;
        }

        html += '<div class="form-fields">';
        section.fields.forEach(field => {
            html += this.renderField(field);
        });
        html += '</div></div>';

        return html;
    },

    /**
     * Render field
     */
    renderField(field) {
        const id = field.id || field.name;
        const required = field.required ? 'required' : '';
        const disabled = field.disabled ? 'disabled' : '';
        const placeholder = field.placeholder || '';
        const value = field.value || '';
        const classes = field.class || '';

        let html = `<div class="form-group ${field.width || ''}" id="group-${id}">`;

        if (field.label) {
            html += `<label class="form-label" for="${id}">${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label>`;
        }

        switch (field.type) {
            case 'text':
            case 'email':
            case 'password':
            case 'number':
            case 'tel':
            case 'url':
                html += `<input type="${field.type}" id="${id}" name="${field.name}" class="form-input ${classes}" placeholder="${placeholder}" value="${value}" ${required} ${disabled} ${this.renderAttributes(field.attributes)}>`;
                break;

            case 'textarea':
                html += `<textarea id="${id}" name="${field.name}" class="form-textarea ${classes}" placeholder="${placeholder}" rows="${field.rows || 4}" ${required} ${disabled}>${value}</textarea>`;
                break;

            case 'select':
                html += `<select id="${id}" name="${field.name}" class="form-select ${classes}" ${required} ${disabled}>`;
                if (field.placeholder) {
                    html += `<option value="">${field.placeholder}</option>`;
                }
                (field.options || []).forEach(opt => {
                    const optValue = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const selected = optValue == value ? 'selected' : '';
                    const optDisabled = opt.disabled ? 'disabled' : '';
                    html += `<option value="${optValue}" ${selected} ${optDisabled}>${optLabel}</option>`;
                });
                html += '</select>';
                break;

            case 'checkbox':
                const checked = value || field.checked ? 'checked' : '';
                html += `
                    <label class="form-checkbox">
                        <input type="checkbox" id="${id}" name="${field.name}" ${checked} ${disabled}>
                        <span class="checkmark"></span>
                        ${field.checkboxLabel || ''}
                    </label>
                `;
                break;

            case 'radio':
                html += '<div class="form-radio-group">';
                (field.options || []).forEach(opt => {
                    const optValue = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const radioChecked = optValue == value ? 'checked' : '';
                    html += `
                        <label class="form-radio">
                            <input type="radio" name="${field.name}" value="${optValue}" ${radioChecked} ${disabled}>
                            <span class="radio-mark"></span>
                            ${optLabel}
                        </label>
                    `;
                });
                html += '</div>';
                break;

            case 'file':
                html += `<input type="file" id="${id}" name="${field.name}" class="form-input ${classes}" accept="${field.accept || ''}" ${field.multiple ? 'multiple' : ''} ${disabled}>`;
                break;

            case 'hidden':
                html += `<input type="hidden" id="${id}" name="${field.name}" value="${value}">`;
                break;

            case 'date':
                html += `<input type="date" id="${id}" name="${field.name}" class="form-input ${classes}" value="${value}" ${required} ${disabled}>`;
                break;

            case 'time':
                html += `<input type="time" id="${id}" name="${field.name}" class="form-input ${classes}" value="${value}" ${required} ${disabled}>`;
                break;

            case 'range':
                html += `
                    <input type="range" id="${id}" name="${field.name}" class="form-range" 
                           min="${field.min || 0}" max="${field.max || 100}" value="${value || field.min || 0}" 
                           step="${field.step || 1}" ${disabled}>
                    <span class="range-value">${value || field.min || 0}</span>
                `;
                break;

            case 'color':
                html += `<input type="color" id="${id}" name="${field.name}" class="form-color" value="${value || '#000000'}" ${disabled}>`;
                break;

            case 'html':
                html += field.content || '';
                break;

            case 'divider':
                html += '<hr class="form-divider">';
                break;
        }

        if (field.helper) {
            html += `<div class="form-helper">${field.helper}</div>`;
        }

        if (field.error) {
            html += `<div class="form-error">${field.error}</div>`;
        }

        html += '</div>';
        return html;
    },

    /**
     * Render custom attributes
     */
    renderAttributes(attrs) {
        if (!attrs) return '';
        return Object.entries(attrs)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');
    },

    /**
     * Mount form to container
     */
    mount(container, schema, options = {}) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!container) return null;

        const { html, config } = this.build(schema, options);
        container.innerHTML = html;

        const form = document.getElementById(config.id);

        // Add event listeners
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (config.validation && !this.validate(form, schema)) {
                return;
            }

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            if (config.onSubmit) {
                await config.onSubmit(data, form);
            }
        });

        if (config.showCancel) {
            form.querySelector('.form-cancel')?.addEventListener('click', () => {
                if (config.onCancel) {
                    config.onCancel(form);
                }
            });
        }

        // Range value display
        form.querySelectorAll('input[type="range"]').forEach(range => {
            const valueDisplay = range.parentElement.querySelector('.range-value');
            range.addEventListener('input', () => {
                if (valueDisplay) valueDisplay.textContent = range.value;
            });
        });

        return form;
    },

    /**
     * Validate form
     */
    validate(form, schema) {
        let isValid = true;
        const fields = this.getAllFields(schema);

        // Clear previous errors
        form.querySelectorAll('.form-error').forEach(el => el.remove());
        form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

        fields.forEach(field => {
            const input = form.querySelector(`[name="${field.name}"]`);
            if (!input) return;

            const value = input.value.trim();
            const group = document.getElementById(`group-${field.id || field.name}`);

            // Required validation
            if (field.required && !value) {
                this.showFieldError(group, 'This field is required');
                isValid = false;
                return;
            }

            // Type-specific validation
            if (value && field.type === 'email' && !this.isValidEmail(value)) {
                this.showFieldError(group, 'Please enter a valid email');
                isValid = false;
                return;
            }

            if (value && field.type === 'url' && !this.isValidUrl(value)) {
                this.showFieldError(group, 'Please enter a valid URL');
                isValid = false;
                return;
            }

            // Min/max validation
            if (field.type === 'number' && value) {
                const num = parseFloat(value);
                if (field.min !== undefined && num < field.min) {
                    this.showFieldError(group, `Minimum value is ${field.min}`);
                    isValid = false;
                    return;
                }
                if (field.max !== undefined && num > field.max) {
                    this.showFieldError(group, `Maximum value is ${field.max}`);
                    isValid = false;
                    return;
                }
            }

            // Pattern validation
            if (field.pattern && value) {
                const regex = new RegExp(field.pattern);
                if (!regex.test(value)) {
                    this.showFieldError(group, field.patternError || 'Invalid format');
                    isValid = false;
                    return;
                }
            }

            // Custom validation
            if (field.validate && value) {
                const error = field.validate(value);
                if (error) {
                    this.showFieldError(group, error);
                    isValid = false;
                }
            }
        });

        return isValid;
    },

    /**
     * Get all fields from schema
     */
    getAllFields(schema) {
        if (schema.fields) return schema.fields;
        if (schema.sections) {
            return schema.sections.reduce((acc, section) => [...acc, ...section.fields], []);
        }
        return [];
    },

    /**
     * Show field error
     */
    showFieldError(group, message) {
        if (!group) return;
        group.classList.add('has-error');
        const errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        errorEl.textContent = message;
        group.appendChild(errorEl);
    },

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Get form values
     */
    getValues(formId) {
        const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
        if (!form) return {};

        const formData = new FormData(form);
        return Object.fromEntries(formData.entries());
    },

    /**
     * Set form values
     */
    setValues(formId, values) {
        const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
        if (!form) return;

        Object.entries(values).forEach(([name, value]) => {
            const input = form.querySelector(`[name="${name}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = !!value;
                } else {
                    input.value = value;
                }
            }
        });
    },

    /**
     * Reset form
     */
    reset(formId) {
        const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
        if (form) form.reset();
    }
};

// Export
window.FormBuilder = FormBuilder;
