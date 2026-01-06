/**
 * SMMFamy - Progress Bar Component
 * Animated progress bars and indicators | ~250 lines
 */

const ProgressBar = {
    instances: new Map(),

    /**
     * Create progress bar
     */
    create(containerId, options = {}) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        if (!container) return null;

        const config = {
            value: 0,
            max: 100,
            type: 'linear', // linear, circular, steps
            size: 'normal', // small, normal, large
            color: 'primary',
            showLabel: true,
            labelFormat: '{value}%',
            animated: true,
            striped: false,
            indeterminate: false,
            steps: [],
            ...options
        };

        const bar = { container, config };
        this.render(bar);
        this.instances.set(container, bar);

        return bar;
    },

    /**
     * Render progress bar
     */
    render(bar) {
        const { container, config } = bar;

        if (config.type === 'circular') {
            this.renderCircular(bar);
        } else if (config.type === 'steps') {
            this.renderSteps(bar);
        } else {
            this.renderLinear(bar);
        }
    },

    /**
     * Render linear progress bar
     */
    renderLinear(bar) {
        const { container, config } = bar;
        const percent = (config.value / config.max) * 100;

        let classes = ['progress-bar', `progress-${config.size}`];
        if (config.animated) classes.push('animated');
        if (config.striped) classes.push('striped');
        if (config.indeterminate) classes.push('indeterminate');

        container.innerHTML = `
            <div class="${classes.join(' ')}">
                <div class="progress-track">
                    <div class="progress-fill progress-${config.color}" 
                         style="width: ${config.indeterminate ? '100%' : percent + '%'}">
                    </div>
                </div>
                ${config.showLabel ? `<span class="progress-label">${this.formatLabel(config)}</span>` : ''}
            </div>
        `;
    },

    /**
     * Render circular progress
     */
    renderCircular(bar) {
        const { container, config } = bar;
        const percent = (config.value / config.max) * 100;

        const size = config.size === 'small' ? 60 : config.size === 'large' ? 120 : 80;
        const strokeWidth = config.size === 'small' ? 4 : config.size === 'large' ? 8 : 6;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (percent / 100) * circumference;

        container.innerHTML = `
            <div class="progress-circular" style="width: ${size}px; height: ${size}px;">
                <svg viewBox="0 0 ${size} ${size}">
                    <circle class="progress-track-circle"
                            cx="${size / 2}" cy="${size / 2}" r="${radius}"
                            stroke-width="${strokeWidth}"/>
                    <circle class="progress-fill-circle progress-${config.color}"
                            cx="${size / 2}" cy="${size / 2}" r="${radius}"
                            stroke-width="${strokeWidth}"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${config.indeterminate ? 0 : offset}"
                            transform="rotate(-90 ${size / 2} ${size / 2})"/>
                </svg>
                ${config.showLabel ? `<span class="progress-circular-label">${this.formatLabel(config)}</span>` : ''}
            </div>
        `;
    },

    /**
     * Render steps progress
     */
    renderSteps(bar) {
        const { container, config } = bar;
        const currentStep = config.value;

        container.innerHTML = `
            <div class="progress-steps">
                ${config.steps.map((step, index) => {
            let status = 'pending';
            if (index < currentStep) status = 'completed';
            else if (index === currentStep) status = 'active';

            return `
                        <div class="progress-step ${status}">
                            <div class="step-indicator">
                                ${status === 'completed' ? '✓' : index + 1}
                            </div>
                            <span class="step-label">${step}</span>
                        </div>
                    `;
        }).join('')}
                <div class="progress-steps-line">
                    <div class="progress-steps-fill" 
                         style="width: ${(currentStep / (config.steps.length - 1)) * 100}%">
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Format label
     */
    formatLabel(config) {
        return config.labelFormat
            .replace('{value}', config.value)
            .replace('{max}', config.max)
            .replace('{percent}', Math.round((config.value / config.max) * 100));
    },

    /**
     * Update value
     */
    setValue(containerId, value, animated = true) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        const bar = this.instances.get(container);
        if (!bar) return;

        if (animated && bar.config.type === 'linear') {
            this.animateValue(bar, value);
        } else {
            bar.config.value = value;
            this.render(bar);
        }
    },

    /**
     * Animate value change
     */
    animateValue(bar, targetValue) {
        const startValue = bar.config.value;
        const duration = 500;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing
            const eased = 1 - Math.pow(1 - progress, 3);

            bar.config.value = startValue + (targetValue - startValue) * eased;
            this.render(bar);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                bar.config.value = targetValue;
                this.render(bar);
            }
        };

        requestAnimationFrame(animate);
    },

    /**
     * Increment value
     */
    increment(containerId, amount = 1) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        const bar = this.instances.get(container);
        if (!bar) return;

        const newValue = Math.min(bar.config.value + amount, bar.config.max);
        this.setValue(container, newValue);
    },

    /**
     * Reset progress
     */
    reset(containerId) {
        this.setValue(containerId, 0, false);
    },

    /**
     * Complete progress
     */
    complete(containerId) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        const bar = this.instances.get(container);
        if (!bar) return;

        this.setValue(container, bar.config.max);
    }
};

// Styles
const progressStyles = document.createElement('style');
progressStyles.textContent = `
    .progress-bar {
        position: relative;
    }
    
    .progress-track {
        background: var(--bg-muted);
        border-radius: var(--radius-full);
        overflow: hidden;
    }
    
    .progress-small .progress-track { height: 4px; }
    .progress-normal .progress-track { height: 8px; }
    .progress-large .progress-track { height: 12px; }
    
    .progress-fill {
        height: 100%;
        border-radius: var(--radius-full);
        transition: width 0.3s ease;
    }
    
    .progress-primary { background: var(--color-primary-500); }
    .progress-success { background: var(--color-success-500); }
    .progress-warning { background: var(--color-warning-500); }
    .progress-error { background: var(--color-error-500); }
    
    .progress-bar.striped .progress-fill {
        background-image: linear-gradient(
            45deg,
            rgba(255,255,255,.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255,255,255,.15) 50%,
            rgba(255,255,255,.15) 75%,
            transparent 75%
        );
        background-size: 1rem 1rem;
    }
    
    .progress-bar.animated.striped .progress-fill {
        animation: progress-stripe 1s linear infinite;
    }
    
    @keyframes progress-stripe {
        from { background-position: 1rem 0; }
        to { background-position: 0 0; }
    }
    
    .progress-bar.indeterminate .progress-fill {
        width: 30% !important;
        animation: progress-indeterminate 1.5s ease-in-out infinite;
    }
    
    @keyframes progress-indeterminate {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
    }
    
    .progress-label {
        display: block;
        text-align: center;
        font-size: var(--text-sm);
        margin-top: var(--space-1);
        color: var(--text-muted);
    }
    
    /* Circular */
    .progress-circular {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .progress-circular svg {
        transform: rotate(-90deg);
    }
    
    .progress-track-circle {
        fill: none;
        stroke: var(--bg-muted);
    }
    
    .progress-fill-circle {
        fill: none;
        stroke: var(--color-primary-500);
        stroke-linecap: round;
        transition: stroke-dashoffset 0.5s ease;
    }
    
    .progress-fill-circle.progress-success { stroke: var(--color-success-500); }
    .progress-fill-circle.progress-warning { stroke: var(--color-warning-500); }
    .progress-fill-circle.progress-error { stroke: var(--color-error-500); }
    
    .progress-circular-label {
        position: absolute;
        font-weight: var(--font-bold);
        font-size: var(--text-sm);
    }
    
    /* Steps */
    .progress-steps {
        display: flex;
        justify-content: space-between;
        position: relative;
        padding: 0 var(--space-4);
    }
    
    .progress-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 1;
    }
    
    .step-indicator {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--bg-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: var(--font-bold);
        font-size: var(--text-sm);
        margin-bottom: var(--space-2);
        transition: all 0.3s ease;
    }
    
    .progress-step.active .step-indicator {
        background: var(--color-primary-500);
        color: white;
    }
    
    .progress-step.completed .step-indicator {
        background: var(--color-success-500);
        color: white;
    }
    
    .step-label {
        font-size: var(--text-xs);
        color: var(--text-muted);
    }
    
    .progress-step.active .step-label,
    .progress-step.completed .step-label {
        color: var(--text-primary);
    }
    
    .progress-steps-line {
        position: absolute;
        top: 16px;
        left: var(--space-8);
        right: var(--space-8);
        height: 2px;
        background: var(--bg-muted);
    }
    
    .progress-steps-fill {
        height: 100%;
        background: var(--color-success-500);
        transition: width 0.5s ease;
    }
`;

document.head.appendChild(progressStyles);

// Export
window.ProgressBar = ProgressBar;
