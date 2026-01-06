/**
 * SMMFamy - Animation Utilities
 * Scroll animations and transitions | ~300 lines
 */

const Animate = {
    observer: null,
    animatedElements: new Set(),

    /**
     * Initialize animation observer
     */
    init() {
        // Create intersection observer
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateElement(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        // Observe elements with data-animate
        document.querySelectorAll('[data-animate]').forEach(el => {
            this.observer.observe(el);
        });

        // Setup staggered animations
        this.setupStagger();
    },

    /**
     * Animate element
     */
    animateElement(element) {
        if (this.animatedElements.has(element)) return;
        this.animatedElements.add(element);

        const animation = element.dataset.animate || 'fadeIn';
        const delay = element.dataset.animateDelay || 0;
        const duration = element.dataset.animateDuration || 600;

        setTimeout(() => {
            element.style.animation = `${animation} ${duration}ms var(--ease-out) forwards`;
            element.classList.add('animated');
        }, parseInt(delay));
    },

    /**
     * Setup staggered animations for lists
     */
    setupStagger() {
        document.querySelectorAll('[data-stagger]').forEach(container => {
            const delay = parseInt(container.dataset.staggerDelay) || 100;
            const children = container.querySelectorAll('[data-animate]');

            children.forEach((child, index) => {
                child.dataset.animateDelay = index * delay;
            });
        });
    },

    /**
     * Manually trigger animation
     */
    trigger(selector, animation = 'fadeIn') {
        const elements = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : [selector];

        elements.forEach(el => {
            el.classList.remove('animated');
            el.style.animation = 'none';
            el.offsetHeight; // Trigger reflow
            el.style.animation = `${animation} 600ms var(--ease-out) forwards`;
            el.classList.add('animated');
        });
    },

    /**
     * Counter animation
     */
    counter(element, target, duration = 2000) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        if (!element) return;

        const start = 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * eased);

            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = target.toLocaleString();
            }
        };

        requestAnimationFrame(animate);
    },

    /**
     * Typewriter effect
     */
    typewriter(element, text, speed = 50) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            let index = 0;
            element.textContent = '';

            const type = () => {
                if (index < text.length) {
                    element.textContent += text.charAt(index);
                    index++;
                    setTimeout(type, speed);
                } else {
                    resolve();
                }
            };

            type();
        });
    },

    /**
     * Shake animation
     */
    shake(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        if (!element) return;

        element.classList.add('shake');
        setTimeout(() => element.classList.remove('shake'), 500);
    },

    /**
     * Pulse animation
     */
    pulse(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        if (!element) return;

        element.classList.add('pulse');
        setTimeout(() => element.classList.remove('pulse'), 600);
    },

    /**
     * Bounce animation
     */
    bounce(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        if (!element) return;

        element.classList.add('bounce');
        setTimeout(() => element.classList.remove('bounce'), 600);
    }
};

// Animation keyframes
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    :root {
        --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
        --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
    }
    
    [data-animate] {
        opacity: 0;
    }
    
    [data-animate].animated {
        opacity: 1;
    }
    
    /* Fade animations */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeInLeft {
        from {
            opacity: 0;
            transform: translateX(-30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes fadeInRight {
        from {
            opacity: 0;
            transform: translateX(30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    /* Scale animations */
    @keyframes scaleIn {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    @keyframes scaleUp {
        from {
            opacity: 0;
            transform: scale(0.5);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    /* Slide animations */
    @keyframes slideInUp {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }
    
    @keyframes slideInDown {
        from {
            transform: translateY(-100%);
        }
        to {
            transform: translateY(0);
        }
    }
    
    /* Effect animations */
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .shake {
        animation: shake 0.5s ease-in-out;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    .pulse {
        animation: pulse 0.6s ease-in-out;
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
    }
    
    .bounce {
        animation: bounce 0.6s ease-in-out;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    
    .floating {
        animation: float 3s ease-in-out infinite;
    }
    
    @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px var(--color-primary-400); }
        50% { box-shadow: 0 0 20px var(--color-primary-400); }
    }
    
    .glowing {
        animation: glow 2s ease-in-out infinite;
    }
    
    /* Skeleton loading */
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    
    .skeleton {
        background: linear-gradient(
            90deg,
            var(--bg-muted) 25%,
            var(--bg-surface) 50%,
            var(--bg-muted) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: var(--radius-md);
    }
    
    .skeleton-text {
        height: 1em;
        margin-bottom: 0.5em;
    }
    
    .skeleton-circle {
        border-radius: 50%;
    }
`;

document.head.appendChild(animationStyles);

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Animate.init());
} else {
    Animate.init();
}

// Export
window.Animate = Animate;
