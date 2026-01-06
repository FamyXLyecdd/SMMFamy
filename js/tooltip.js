/**
 * SMMFamy - Tooltip Component
 * Customizable tooltips | ~250 lines
 */

const Tooltip = {
    activeTooltip: null,

    /**
     * Initialize all tooltips
     */
    init() {
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            this.setup(element);
        });

        // Use MutationObserver for dynamic content
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.hasAttribute('data-tooltip')) {
                            this.setup(node);
                        }
                        node.querySelectorAll?.('[data-tooltip]').forEach(el => {
                            this.setup(el);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * Setup tooltip on element
     */
    setup(element) {
        if (element._tooltipSetup) return;
        element._tooltipSetup = true;

        let timeout;

        element.addEventListener('mouseenter', () => {
            timeout = setTimeout(() => {
                this.show(element);
            }, 200);
        });

        element.addEventListener('mouseleave', () => {
            clearTimeout(timeout);
            this.hide();
        });

        element.addEventListener('focus', () => {
            this.show(element);
        });

        element.addEventListener('blur', () => {
            this.hide();
        });
    },

    /**
     * Show tooltip
     */
    show(element) {
        this.hide();

        const text = element.getAttribute('data-tooltip');
        const position = element.getAttribute('data-tooltip-position') || 'top';

        if (!text) return;

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = text;

        document.body.appendChild(tooltip);
        this.activeTooltip = tooltip;

        // Position tooltip
        this.position(element, tooltip, position);

        // Show with animation
        requestAnimationFrame(() => {
            tooltip.classList.add('tooltip-visible');
        });
    },

    /**
     * Position tooltip
     */
    position(element, tooltip, position) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        let top, left;
        const gap = 8;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - gap + scrollY;
                left = rect.left + (rect.width - tooltipRect.width) / 2 + scrollX;
                break;
            case 'bottom':
                top = rect.bottom + gap + scrollY;
                left = rect.left + (rect.width - tooltipRect.width) / 2 + scrollX;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2 + scrollY;
                left = rect.left - tooltipRect.width - gap + scrollX;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2 + scrollY;
                left = rect.right + gap + scrollX;
                break;
        }

        // Keep in viewport
        const padding = 8;
        if (left < padding) left = padding;
        if (left + tooltipRect.width > window.innerWidth - padding) {
            left = window.innerWidth - tooltipRect.width - padding;
        }
        if (top < padding) top = padding;
        if (top + tooltipRect.height > window.innerHeight + scrollY - padding) {
            top = window.innerHeight + scrollY - tooltipRect.height - padding;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    },

    /**
     * Hide tooltip
     */
    hide() {
        if (this.activeTooltip) {
            this.activeTooltip.classList.remove('tooltip-visible');
            setTimeout(() => {
                this.activeTooltip?.remove();
                this.activeTooltip = null;
            }, 150);
        }
    },

    /**
     * Create tooltip programmatically
     */
    create(element, text, position = 'top') {
        element.setAttribute('data-tooltip', text);
        element.setAttribute('data-tooltip-position', position);
        this.setup(element);
    }
};

// Tooltip styles
const tooltipStyles = document.createElement('style');
tooltipStyles.textContent = `
    .tooltip {
        position: absolute;
        z-index: 10000;
        padding: var(--space-1) var(--space-2);
        background: var(--color-gray-900);
        color: white;
        font-size: var(--text-xs);
        font-weight: var(--font-medium);
        border-radius: var(--radius-md);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: scale(0.95);
        transition: opacity 0.15s, transform 0.15s;
    }
    
    .tooltip-visible {
        opacity: 1;
        transform: scale(1);
    }
    
    .tooltip::before {
        content: '';
        position: absolute;
        border: 5px solid transparent;
    }
    
    .tooltip-top::before {
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: var(--color-gray-900);
    }
    
    .tooltip-bottom::before {
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: var(--color-gray-900);
    }
    
    .tooltip-left::before {
        right: -10px;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: var(--color-gray-900);
    }
    
    .tooltip-right::before {
        left: -10px;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: var(--color-gray-900);
    }
`;

document.head.appendChild(tooltipStyles);

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Tooltip.init());
} else {
    Tooltip.init();
}

// Export for use
window.Tooltip = Tooltip;
