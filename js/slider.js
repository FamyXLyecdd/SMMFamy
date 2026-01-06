/**
 * SMMFamy - Slider Component
 * Custom range slider with labels | ~250 lines
 */

const Slider = {
    instances: new Map(),

    /**
     * Create slider
     */
    create(containerId, options = {}) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        if (!container) return null;

        const config = {
            min: 0,
            max: 100,
            value: 50,
            step: 1,
            showValue: true,
            showLabels: true,
            prefix: '',
            suffix: '',
            color: 'primary',
            disabled: false,
            onChange: null,
            onInput: null,
            ...options
        };

        const slider = { container, config };
        this.render(slider);
        this.instances.set(container, slider);

        return slider;
    },

    /**
     * Render slider
     */
    render(slider) {
        const { container, config } = slider;
        const percent = ((config.value - config.min) / (config.max - config.min)) * 100;

        container.innerHTML = `
            <div class="slider-component ${config.disabled ? 'disabled' : ''}">
                ${config.showLabels ? `
                    <div class="slider-labels">
                        <span>${config.prefix}${config.min}${config.suffix}</span>
                        <span>${config.prefix}${config.max}${config.suffix}</span>
                    </div>
                ` : ''}
                <div class="slider-track-container">
                    <div class="slider-track">
                        <div class="slider-fill slider-${config.color}" style="width: ${percent}%"></div>
                    </div>
                    <input type="range" 
                           class="slider-input"
                           min="${config.min}"
                           max="${config.max}"
                           step="${config.step}"
                           value="${config.value}"
                           ${config.disabled ? 'disabled' : ''}>
                    <div class="slider-thumb slider-${config.color}" style="left: ${percent}%"></div>
                </div>
                ${config.showValue ? `
                    <div class="slider-value">${config.prefix}${config.value}${config.suffix}</div>
                ` : ''}
            </div>
        `;

        // Add event listeners
        const input = container.querySelector('.slider-input');

        input.addEventListener('input', (e) => {
            config.value = parseFloat(e.target.value);
            this.updateVisual(slider);

            if (config.onInput) {
                config.onInput(config.value);
            }
        });

        input.addEventListener('change', () => {
            if (config.onChange) {
                config.onChange(config.value);
            }
        });
    },

    /**
     * Update visual without full re-render
     */
    updateVisual(slider) {
        const { container, config } = slider;
        const percent = ((config.value - config.min) / (config.max - config.min)) * 100;

        const fill = container.querySelector('.slider-fill');
        const thumb = container.querySelector('.slider-thumb');
        const valueDisplay = container.querySelector('.slider-value');

        if (fill) fill.style.width = `${percent}%`;
        if (thumb) thumb.style.left = `${percent}%`;
        if (valueDisplay) valueDisplay.textContent = `${config.prefix}${config.value}${config.suffix}`;
    },

    /**
     * Get value
     */
    getValue(containerId) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        const slider = this.instances.get(container);
        return slider ? slider.config.value : null;
    },

    /**
     * Set value
     */
    setValue(containerId, value, triggerChange = true) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        const slider = this.instances.get(container);
        if (!slider) return;

        slider.config.value = Math.max(slider.config.min, Math.min(slider.config.max, value));

        const input = container.querySelector('.slider-input');
        if (input) input.value = slider.config.value;

        this.updateVisual(slider);

        if (triggerChange && slider.config.onChange) {
            slider.config.onChange(slider.config.value);
        }
    },

    /**
     * Enable/disable
     */
    setDisabled(containerId, disabled) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        const slider = this.instances.get(container);
        if (!slider) return;

        slider.config.disabled = disabled;
        this.render(slider);
    }
};

// Styles
const sliderStyles = document.createElement('style');
sliderStyles.textContent = `
    .slider-component {
        width: 100%;
    }
    
    .slider-component.disabled {
        opacity: 0.5;
        pointer-events: none;
    }
    
    .slider-labels {
        display: flex;
        justify-content: space-between;
        font-size: var(--text-xs);
        color: var(--text-muted);
        margin-bottom: var(--space-2);
    }
    
    .slider-track-container {
        position: relative;
        padding: var(--space-2) 0;
    }
    
    .slider-track {
        height: 6px;
        background: var(--bg-muted);
        border-radius: var(--radius-full);
        overflow: hidden;
    }
    
    .slider-fill {
        height: 100%;
        border-radius: var(--radius-full);
        transition: width 0.1s ease;
    }
    
    .slider-fill.slider-primary { background: var(--color-primary-500); }
    .slider-fill.slider-success { background: var(--color-success-500); }
    .slider-fill.slider-warning { background: var(--color-warning-500); }
    .slider-fill.slider-error { background: var(--color-error-500); }
    
    .slider-input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        margin: 0;
    }
    
    .slider-thumb {
        position: absolute;
        top: 50%;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        box-shadow: var(--shadow-md);
        transform: translate(-50%, -50%);
        pointer-events: none;
        border: 3px solid var(--color-primary-500);
        transition: transform 0.1s ease;
    }
    
    .slider-input:focus + .slider-thumb,
    .slider-input:hover + .slider-thumb {
        transform: translate(-50%, -50%) scale(1.1);
    }
    
    .slider-input:active + .slider-thumb {
        transform: translate(-50%, -50%) scale(0.95);
    }
    
    .slider-thumb.slider-primary { border-color: var(--color-primary-500); }
    .slider-thumb.slider-success { border-color: var(--color-success-500); }
    .slider-thumb.slider-warning { border-color: var(--color-warning-500); }
    .slider-thumb.slider-error { border-color: var(--color-error-500); }
    
    .slider-value {
        text-align: center;
        font-size: var(--text-sm);
        font-weight: var(--font-semibold);
        margin-top: var(--space-2);
        color: var(--text-primary);
    }
`;

document.head.appendChild(sliderStyles);

// Export
window.Slider = Slider;
