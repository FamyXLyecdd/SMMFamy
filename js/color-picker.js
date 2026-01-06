/**
 * SMMFamy - Color Picker Component
 * HSL-based color picker | ~350 lines
 */

const ColorPicker = {
    instances: new Map(),

    /**
     * Create color picker
     */
    create(inputId, options = {}) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        if (!input) return null;

        const config = {
            defaultColor: '#a855f7',
            showAlpha: true,
            showInput: true,
            showPresets: true,
            presets: [
                '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
                '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#6b7280'
            ],
            onChange: null,
            onOpen: null,
            onClose: null,
            ...options
        };

        const picker = {
            input,
            config,
            container: null,
            dropdown: null,
            currentColor: this.parseColor(input.value || config.defaultColor),
            isOpen: false
        };

        this.setup(picker);
        this.instances.set(input, picker);

        return picker;
    },

    /**
     * Setup picker
     */
    setup(picker) {
        const { input, config } = picker;

        // Create wrapper
        picker.container = document.createElement('div');
        picker.container.className = 'color-picker-container';
        input.parentNode.insertBefore(picker.container, input);

        // Create preview button
        const preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'color-picker-preview';
        preview.style.backgroundColor = this.colorToHex(picker.currentColor);
        picker.container.appendChild(preview);

        if (config.showInput) {
            input.className = 'color-picker-input';
            picker.container.appendChild(input);
        } else {
            input.type = 'hidden';
            picker.container.appendChild(input);
        }

        // Create dropdown
        picker.dropdown = document.createElement('div');
        picker.dropdown.className = 'color-picker-dropdown';
        picker.dropdown.innerHTML = this.renderDropdown(picker);
        picker.container.appendChild(picker.dropdown);

        // Event listeners
        preview.addEventListener('click', () => this.toggle(picker));

        document.addEventListener('click', (e) => {
            if (!picker.container.contains(e.target)) {
                this.close(picker);
            }
        });

        // Slider events
        this.setupSliders(picker);

        // Presets
        picker.dropdown.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                picker.currentColor = this.parseColor(color);
                this.updateAll(picker);
            });
        });

        // Input change
        if (config.showInput) {
            input.addEventListener('input', (e) => {
                const color = this.parseColor(e.target.value);
                if (color) {
                    picker.currentColor = color;
                    this.updateAll(picker, false);
                }
            });
        }
    },

    /**
     * Render dropdown
     */
    renderDropdown(picker) {
        const { config } = picker;

        let html = `
            <div class="color-picker-saturation">
                <div class="saturation-picker">
                    <div class="saturation-handle"></div>
                </div>
            </div>
            <div class="color-sliders">
                <div class="slider-row">
                    <label>H</label>
                    <input type="range" class="hue-slider" min="0" max="360" value="${picker.currentColor.h}">
                    <span class="slider-value">${picker.currentColor.h}°</span>
                </div>
                <div class="slider-row">
                    <label>S</label>
                    <input type="range" class="saturation-slider" min="0" max="100" value="${picker.currentColor.s}">
                    <span class="slider-value">${picker.currentColor.s}%</span>
                </div>
                <div class="slider-row">
                    <label>L</label>
                    <input type="range" class="lightness-slider" min="0" max="100" value="${picker.currentColor.l}">
                    <span class="slider-value">${picker.currentColor.l}%</span>
                </div>
        `;

        if (config.showAlpha) {
            html += `
                <div class="slider-row">
                    <label>A</label>
                    <input type="range" class="alpha-slider" min="0" max="100" value="${(picker.currentColor.a || 1) * 100}">
                    <span class="slider-value">${Math.round((picker.currentColor.a || 1) * 100)}%</span>
                </div>
            `;
        }

        html += '</div>';

        if (config.showPresets) {
            html += `
                <div class="color-presets">
                    ${config.presets.map(c => `
                        <button type="button" class="color-preset" data-color="${c}" style="background: ${c}"></button>
                    `).join('')}
                </div>
            `;
        }

        return html;
    },

    /**
     * Setup sliders
     */
    setupSliders(picker) {
        const { dropdown } = picker;

        const hue = dropdown.querySelector('.hue-slider');
        const sat = dropdown.querySelector('.saturation-slider');
        const light = dropdown.querySelector('.lightness-slider');
        const alpha = dropdown.querySelector('.alpha-slider');

        hue?.addEventListener('input', (e) => {
            picker.currentColor.h = parseInt(e.target.value);
            this.updateAll(picker);
        });

        sat?.addEventListener('input', (e) => {
            picker.currentColor.s = parseInt(e.target.value);
            this.updateAll(picker);
        });

        light?.addEventListener('input', (e) => {
            picker.currentColor.l = parseInt(e.target.value);
            this.updateAll(picker);
        });

        alpha?.addEventListener('input', (e) => {
            picker.currentColor.a = parseInt(e.target.value) / 100;
            this.updateAll(picker);
        });
    },

    /**
     * Update all displays
     */
    updateAll(picker, updateInput = true) {
        const { container, dropdown, input, config, currentColor } = picker;

        const hex = this.colorToHex(currentColor);

        // Update preview
        container.querySelector('.color-picker-preview').style.backgroundColor = hex;

        // Update sliders
        dropdown.querySelector('.hue-slider').value = currentColor.h;
        dropdown.querySelector('.saturation-slider').value = currentColor.s;
        dropdown.querySelector('.lightness-slider').value = currentColor.l;

        if (config.showAlpha) {
            dropdown.querySelector('.alpha-slider').value = (currentColor.a || 1) * 100;
        }

        // Update slider values
        const values = dropdown.querySelectorAll('.slider-value');
        values[0].textContent = `${currentColor.h}°`;
        values[1].textContent = `${currentColor.s}%`;
        values[2].textContent = `${currentColor.l}%`;
        if (config.showAlpha && values[3]) {
            values[3].textContent = `${Math.round((currentColor.a || 1) * 100)}%`;
        }

        // Update input
        if (updateInput) {
            input.value = hex;
        }

        // Update saturation picker background
        const satPicker = dropdown.querySelector('.saturation-picker');
        satPicker.style.background = `hsl(${currentColor.h}, 100%, 50%)`;

        // Callback
        if (config.onChange) {
            config.onChange(hex, currentColor);
        }
    },

    /**
     * Parse color string to HSL
     */
    parseColor(color) {
        // Default
        let h = 0, s = 100, l = 50, a = 1;

        // Hex
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            let r, g, b;

            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16) / 255;
                g = parseInt(hex[1] + hex[1], 16) / 255;
                b = parseInt(hex[2] + hex[2], 16) / 255;
            } else {
                r = parseInt(hex.slice(0, 2), 16) / 255;
                g = parseInt(hex.slice(2, 4), 16) / 255;
                b = parseInt(hex.slice(4, 6), 16) / 255;
                if (hex.length === 8) {
                    a = parseInt(hex.slice(6, 8), 16) / 255;
                }
            }

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            l = (max + min) / 2;

            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }

            h = Math.round(h * 360);
            s = Math.round(s * 100);
            l = Math.round(l * 100);
        }

        return { h, s, l, a };
    },

    /**
     * Convert HSL to hex
     */
    colorToHex(color) {
        const { h, s, l, a = 1 } = color;

        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const sNorm = s / 100;
        const lNorm = l / 100;

        let r, g, b;

        if (sNorm === 0) {
            r = g = b = lNorm;
        } else {
            const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
            const p = 2 * lNorm - q;
            r = hue2rgb(p, q, h / 360 + 1 / 3);
            g = hue2rgb(p, q, h / 360);
            b = hue2rgb(p, q, h / 360 - 1 / 3);
        }

        const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    },

    /**
     * Toggle dropdown
     */
    toggle(picker) {
        if (picker.isOpen) {
            this.close(picker);
        } else {
            this.open(picker);
        }
    },

    /**
     * Open dropdown
     */
    open(picker) {
        picker.dropdown.classList.add('open');
        picker.isOpen = true;
        if (picker.config.onOpen) picker.config.onOpen();
    },

    /**
     * Close dropdown
     */
    close(picker) {
        picker.dropdown.classList.remove('open');
        picker.isOpen = false;
        if (picker.config.onClose) picker.config.onClose();
    },

    /**
     * Get value
     */
    getValue(inputId) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        const picker = this.instances.get(input);
        return picker ? this.colorToHex(picker.currentColor) : null;
    },

    /**
     * Set value
     */
    setValue(inputId, color) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        const picker = this.instances.get(input);
        if (!picker) return;

        picker.currentColor = this.parseColor(color);
        this.updateAll(picker);
    }
};

// Styles
const colorPickerStyles = document.createElement('style');
colorPickerStyles.textContent = `
    .color-picker-container {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        position: relative;
    }
    
    .color-picker-preview {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        border: 2px solid var(--border-default);
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .color-picker-preview:hover {
        transform: scale(1.05);
    }
    
    .color-picker-input {
        width: 80px;
        padding: var(--space-2);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        font-family: monospace;
        font-size: var(--text-sm);
    }
    
    .color-picker-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        padding: var(--space-4);
        margin-top: var(--space-2);
        width: 260px;
        z-index: 100;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s ease;
    }
    
    .color-picker-dropdown.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
    
    .color-picker-saturation {
        margin-bottom: var(--space-4);
    }
    
    .saturation-picker {
        height: 120px;
        border-radius: var(--radius-md);
        position: relative;
        cursor: crosshair;
        background: linear-gradient(to right, #fff, transparent),
                    linear-gradient(to top, #000, transparent);
    }
    
    .saturation-handle {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
        position: absolute;
        transform: translate(-50%, -50%);
    }
    
    .color-sliders {
        margin-bottom: var(--space-4);
    }
    
    .slider-row {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-bottom: var(--space-2);
    }
    
    .slider-row label {
        width: 16px;
        font-weight: var(--font-semibold);
        font-size: var(--text-sm);
    }
    
    .slider-row input[type="range"] {
        flex: 1;
        accent-color: var(--color-primary-500);
    }
    
    .slider-value {
        width: 40px;
        font-size: var(--text-xs);
        text-align: right;
        color: var(--text-muted);
    }
    
    .color-presets {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
    }
    
    .color-preset {
        width: 24px;
        height: 24px;
        border-radius: var(--radius-sm);
        border: 2px solid transparent;
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .color-preset:hover {
        transform: scale(1.1);
        border-color: var(--border-default);
    }
`;

document.head.appendChild(colorPickerStyles);

// Export
window.ColorPicker = ColorPicker;
