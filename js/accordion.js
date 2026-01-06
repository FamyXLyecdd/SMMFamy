/**
 * SMMFamy - Accordion Component
 * Collapsible content panels | ~200 lines
 */

const Accordion = {
    /**
     * Initialize all accordions
     */
    init() {
        document.querySelectorAll('[data-accordion]').forEach(element => {
            this.setup(element);
        });
    },

    /**
     * Setup accordion
     */
    setup(element, options = {}) {
        const defaults = {
            multiple: false, // Allow multiple open panels
            animated: true
        };

        const config = { ...defaults, ...options };
        const multiple = element.hasAttribute('data-accordion-multiple') || config.multiple;

        const triggers = element.querySelectorAll('[data-accordion-trigger]');

        triggers.forEach((trigger, index) => {
            const content = trigger.nextElementSibling;
            if (!content || !content.hasAttribute('data-accordion-content')) return;

            const id = `accordion-${Date.now()}-${index}`;
            const isOpen = trigger.classList.contains('accordion-open');

            // Set ARIA attributes
            trigger.setAttribute('id', `${id}-trigger`);
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            trigger.setAttribute('aria-controls', `${id}-content`);

            content.setAttribute('id', `${id}-content`);
            content.setAttribute('aria-labelledby', `${id}-trigger`);
            content.setAttribute('role', 'region');

            if (!isOpen) {
                content.style.maxHeight = '0';
                content.style.overflow = 'hidden';
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
            }

            // Click handler
            trigger.addEventListener('click', () => {
                const wasOpen = trigger.classList.contains('accordion-open');

                // Close others if not multiple
                if (!multiple && !wasOpen) {
                    triggers.forEach(t => {
                        if (t !== trigger && t.classList.contains('accordion-open')) {
                            this.close(t);
                        }
                    });
                }

                // Toggle current
                if (wasOpen) {
                    this.close(trigger);
                } else {
                    this.open(trigger);
                }
            });

            // Keyboard handler
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    trigger.click();
                }
            });
        });
    },

    /**
     * Open panel
     */
    open(trigger) {
        const content = trigger.nextElementSibling;
        if (!content) return;

        trigger.classList.add('accordion-open');
        trigger.setAttribute('aria-expanded', 'true');

        content.style.maxHeight = content.scrollHeight + 'px';

        // Dispatch event
        trigger.dispatchEvent(new CustomEvent('accordion:open', { bubbles: true }));
    },

    /**
     * Close panel
     */
    close(trigger) {
        const content = trigger.nextElementSibling;
        if (!content) return;

        trigger.classList.remove('accordion-open');
        trigger.setAttribute('aria-expanded', 'false');

        content.style.maxHeight = '0';

        // Dispatch event
        trigger.dispatchEvent(new CustomEvent('accordion:close', { bubbles: true }));
    },

    /**
     * Toggle panel
     */
    toggle(trigger) {
        if (trigger.classList.contains('accordion-open')) {
            this.close(trigger);
        } else {
            this.open(trigger);
        }
    },

    /**
     * Open all panels
     */
    openAll(accordion) {
        accordion.querySelectorAll('[data-accordion-trigger]').forEach(trigger => {
            this.open(trigger);
        });
    },

    /**
     * Close all panels
     */
    closeAll(accordion) {
        accordion.querySelectorAll('[data-accordion-trigger]').forEach(trigger => {
            this.close(trigger);
        });
    }
};

// Accordion styles
const accordionStyles = document.createElement('style');
accordionStyles.textContent = `
    [data-accordion] {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }
    
    .accordion-item {
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        overflow: hidden;
    }
    
    [data-accordion-trigger] {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: var(--space-4);
        background: transparent;
        border: none;
        text-align: left;
        font-size: var(--text-base);
        font-weight: var(--font-semibold);
        color: var(--text-primary);
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    [data-accordion-trigger]:hover {
        background: var(--bg-surface);
    }
    
    [data-accordion-trigger]::after {
        content: '+';
        font-size: var(--text-xl);
        font-weight: var(--font-normal);
        color: var(--text-muted);
        transition: transform 0.2s ease;
    }
    
    [data-accordion-trigger].accordion-open::after {
        content: '-';
    }
    
    [data-accordion-content] {
        transition: max-height 0.3s ease;
    }
    
    .accordion-content-inner {
        padding: 0 var(--space-4) var(--space-4);
        color: var(--text-secondary);
    }
`;

document.head.appendChild(accordionStyles);

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Accordion.init());
} else {
    Accordion.init();
}

// Export for use
window.Accordion = Accordion;
