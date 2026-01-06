/**
 * SMMFamy - Lazy Loader
 * Lazy loading for images and content | ~200 lines
 */

const LazyLoader = {
    observer: null,
    loadedCount: 0,

    /**
     * Initialize lazy loader
     */
    init() {
        // Create intersection observer
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.load(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            {
                rootMargin: '100px 0px',
                threshold: 0.01
            }
        );

        // Observe all lazy elements
        this.observeAll();
    },

    /**
     * Observe all lazy elements
     */
    observeAll() {
        document.querySelectorAll('[data-lazy]').forEach(el => {
            this.observer.observe(el);
        });

        document.querySelectorAll('img[data-src]').forEach(el => {
            this.observer.observe(el);
        });
    },

    /**
     * Load element
     */
    load(element) {
        if (element.dataset.loaded === 'true') return;

        // Image lazy loading
        if (element.tagName === 'IMG' && element.dataset.src) {
            this.loadImage(element);
            return;
        }

        // Background image lazy loading
        if (element.dataset.bg) {
            this.loadBackground(element);
            return;
        }

        // Content lazy loading
        if (element.dataset.lazyContent) {
            this.loadContent(element);
            return;
        }

        // Video lazy loading
        if (element.tagName === 'VIDEO' && element.dataset.src) {
            this.loadVideo(element);
            return;
        }

        // Iframe lazy loading
        if (element.tagName === 'IFRAME' && element.dataset.src) {
            element.src = element.dataset.src;
            element.dataset.loaded = 'true';
        }
    },

    /**
     * Load image
     */
    loadImage(img) {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;

        // Create temporary image to preload
        const temp = new Image();

        temp.onload = () => {
            img.src = src;
            if (srcset) img.srcset = srcset;
            img.classList.add('lazy-loaded');
            img.dataset.loaded = 'true';
            this.loadedCount++;

            // Dispatch event
            img.dispatchEvent(new CustomEvent('lazyloaded'));
        };

        temp.onerror = () => {
            img.classList.add('lazy-error');
            img.alt = img.alt || 'Image failed to load';
        };

        temp.src = src;
    },

    /**
     * Load background image
     */
    loadBackground(element) {
        const bg = element.dataset.bg;

        const temp = new Image();
        temp.onload = () => {
            element.style.backgroundImage = `url(${bg})`;
            element.classList.add('lazy-loaded');
            element.dataset.loaded = 'true';
        };

        temp.src = bg;
    },

    /**
     * Load video
     */
    loadVideo(video) {
        video.src = video.dataset.src;
        video.classList.add('lazy-loaded');
        video.dataset.loaded = 'true';
    },

    /**
     * Load dynamic content via fetch
     */
    async loadContent(element) {
        const url = element.dataset.lazyContent;

        try {
            element.classList.add('lazy-loading');

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load content');

            const html = await response.text();
            element.innerHTML = html;
            element.classList.remove('lazy-loading');
            element.classList.add('lazy-loaded');
            element.dataset.loaded = 'true';

            // Initialize any new lazy elements within loaded content
            element.querySelectorAll('[data-lazy], img[data-src]').forEach(el => {
                this.observer.observe(el);
            });

        } catch (error) {
            element.classList.remove('lazy-loading');
            element.classList.add('lazy-error');
            console.error('Lazy content load failed:', error);
        }
    },

    /**
     * Force load all remaining elements
     */
    loadAll() {
        document.querySelectorAll('[data-lazy]:not([data-loaded])').forEach(el => {
            this.load(el);
        });

        document.querySelectorAll('img[data-src]:not([data-loaded])').forEach(el => {
            this.loadImage(el);
        });
    },

    /**
     * Create placeholder element
     */
    createPlaceholder(width, height, color = '#e0e0e0') {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                <rect width="100%" height="100%" fill="${color}"/>
            </svg>
        `;
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },

    /**
     * Get load statistics
     */
    getStats() {
        return {
            loaded: this.loadedCount,
            pending: document.querySelectorAll('[data-lazy]:not([data-loaded]), img[data-src]:not([data-loaded])').length
        };
    }
};

// Lazy loader styles
const lazyStyles = document.createElement('style');
lazyStyles.textContent = `
    img[data-src],
    [data-lazy] {
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    img.lazy-loaded,
    .lazy-loaded {
        opacity: 1;
    }
    
    .lazy-loading {
        position: relative;
    }
    
    .lazy-loading::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
            90deg,
            var(--bg-muted) 25%,
            var(--bg-surface) 50%,
            var(--bg-muted) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
    
    .lazy-error {
        background: var(--bg-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
    }
    
    .lazy-error::before {
        content: '⚠️';
        font-size: 24px;
    }
`;

document.head.appendChild(lazyStyles);

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LazyLoader.init());
} else {
    LazyLoader.init();
}

// Export
window.LazyLoader = LazyLoader;
