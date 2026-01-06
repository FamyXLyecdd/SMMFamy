/**
 * SMMFamy - Card Slider / Carousel
 * Swipeable card carousel | ~350 lines
 */

const CardSlider = {
    instances: new Map(),

    /**
     * Create carousel
     */
    create(containerId, options = {}) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        if (!container) return null;

        const config = {
            autoplay: false,
            autoplayInterval: 5000,
            loop: true,
            slidesPerView: 1,
            spaceBetween: 16,
            showDots: true,
            showArrows: true,
            draggable: true,
            threshold: 50,
            speed: 300,
            onChange: null,
            ...options
        };

        const slider = {
            container,
            config,
            currentIndex: 0,
            slidesCount: 0,
            track: null,
            isDragging: false,
            startX: 0,
            currentX: 0,
            timer: null
        };

        this.setup(slider);
        this.instances.set(container, slider);

        return slider;
    },

    /**
     * Setup slider
     */
    setup(slider) {
        const { container, config } = slider;

        // Get slides
        const slides = Array.from(container.children);
        slider.slidesCount = slides.length;

        // Create wrapper structure
        container.classList.add('card-slider');

        const wrapper = document.createElement('div');
        wrapper.className = 'slider-wrapper';

        slider.track = document.createElement('div');
        slider.track.className = 'slider-track';
        slider.track.style.gap = `${config.spaceBetween}px`;

        slides.forEach(slide => {
            slide.classList.add('slide');
            slider.track.appendChild(slide);
        });

        wrapper.appendChild(slider.track);
        container.appendChild(wrapper);

        // Add arrows
        if (config.showArrows && slider.slidesCount > config.slidesPerView) {
            container.innerHTML += `
                <button class="slider-arrow slider-prev">‹</button>
                <button class="slider-arrow slider-next">›</button>
            `;

            container.querySelector('.slider-prev').addEventListener('click', () => this.prev(slider));
            container.querySelector('.slider-next').addEventListener('click', () => this.next(slider));
        }

        // Add dots
        if (config.showDots && slider.slidesCount > config.slidesPerView) {
            const dotsCount = Math.ceil(slider.slidesCount / config.slidesPerView);
            let dotsHtml = '<div class="slider-dots">';
            for (let i = 0; i < dotsCount; i++) {
                dotsHtml += `<button class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`;
            }
            dotsHtml += '</div>';
            container.innerHTML += dotsHtml;

            container.querySelectorAll('.slider-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    this.goTo(slider, parseInt(dot.dataset.index) * config.slidesPerView);
                });
            });
        }

        // Dragging
        if (config.draggable) {
            this.setupDrag(slider);
        }

        // Autoplay
        if (config.autoplay) {
            this.startAutoplay(slider);

            container.addEventListener('mouseenter', () => this.stopAutoplay(slider));
            container.addEventListener('mouseleave', () => this.startAutoplay(slider));
        }

        // Initial position
        this.updatePosition(slider);

        // Resize observer
        const resizeObserver = new ResizeObserver(() => {
            this.updatePosition(slider);
        });
        resizeObserver.observe(container);
    },

    /**
     * Setup drag functionality
     */
    setupDrag(slider) {
        const { track, config } = slider;

        const dragStart = (e) => {
            slider.isDragging = true;
            slider.startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            slider.currentX = slider.startX;
            track.style.transition = 'none';
        };

        const dragMove = (e) => {
            if (!slider.isDragging) return;
            slider.currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const diff = slider.currentX - slider.startX;
            const currentOffset = this.getOffset(slider);
            track.style.transform = `translateX(${currentOffset + diff}px)`;
        };

        const dragEnd = () => {
            if (!slider.isDragging) return;
            slider.isDragging = false;
            track.style.transition = `transform ${config.speed}ms ease`;

            const diff = slider.currentX - slider.startX;

            if (Math.abs(diff) > config.threshold) {
                if (diff > 0) {
                    this.prev(slider);
                } else {
                    this.next(slider);
                }
            } else {
                this.updatePosition(slider);
            }
        };

        // Mouse events
        track.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);

        // Touch events
        track.addEventListener('touchstart', dragStart, { passive: true });
        track.addEventListener('touchmove', dragMove, { passive: true });
        track.addEventListener('touchend', dragEnd);
    },

    /**
     * Get current offset
     */
    getOffset(slider) {
        const { container, config, currentIndex } = slider;
        const slideWidth = container.offsetWidth / config.slidesPerView;
        return -(currentIndex * (slideWidth + config.spaceBetween));
    },

    /**
     * Update position
     */
    updatePosition(slider) {
        const { track, config } = slider;
        const offset = this.getOffset(slider);
        track.style.transition = `transform ${config.speed}ms ease`;
        track.style.transform = `translateX(${offset}px)`;
        this.updateDots(slider);
    },

    /**
     * Update dots
     */
    updateDots(slider) {
        const { container, config, currentIndex } = slider;
        const dotIndex = Math.floor(currentIndex / config.slidesPerView);

        container.querySelectorAll('.slider-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === dotIndex);
        });
    },

    /**
     * Go to slide
     */
    goTo(slider, index) {
        const { config, slidesCount } = slider;
        const maxIndex = slidesCount - config.slidesPerView;

        if (config.loop) {
            if (index < 0) index = maxIndex;
            if (index > maxIndex) index = 0;
        } else {
            index = Math.max(0, Math.min(maxIndex, index));
        }

        slider.currentIndex = index;
        this.updatePosition(slider);

        if (config.onChange) {
            config.onChange(index);
        }
    },

    /**
     * Next slide
     */
    next(slider) {
        this.goTo(slider, slider.currentIndex + slider.config.slidesPerView);
    },

    /**
     * Previous slide
     */
    prev(slider) {
        this.goTo(slider, slider.currentIndex - slider.config.slidesPerView);
    },

    /**
     * Start autoplay
     */
    startAutoplay(slider) {
        if (slider.timer) return;
        slider.timer = setInterval(() => {
            this.next(slider);
        }, slider.config.autoplayInterval);
    },

    /**
     * Stop autoplay
     */
    stopAutoplay(slider) {
        if (slider.timer) {
            clearInterval(slider.timer);
            slider.timer = null;
        }
    }
};

// Styles
const sliderStyles = document.createElement('style');
sliderStyles.textContent = `
    .card-slider {
        position: relative;
        overflow: hidden;
    }
    
    .slider-wrapper {
        overflow: hidden;
        padding: var(--space-2);
        margin: calc(-1 * var(--space-2));
    }
    
    .slider-track {
        display: flex;
        will-change: transform;
    }
    
    .slide {
        flex-shrink: 0;
        width: 100%;
    }
    
    .slider-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 40px;
        height: 40px;
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
        font-size: 20px;
        cursor: pointer;
        z-index: 10;
        box-shadow: var(--shadow-md);
        transition: var(--transition-fast);
    }
    
    .slider-arrow:hover {
        background: var(--color-primary-500);
        color: white;
        border-color: var(--color-primary-500);
    }
    
    .slider-prev {
        left: var(--space-2);
    }
    
    .slider-next {
        right: var(--space-2);
    }
    
    .slider-dots {
        display: flex;
        justify-content: center;
        gap: var(--space-2);
        margin-top: var(--space-4);
    }
    
    .slider-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--bg-muted);
        border: none;
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .slider-dot:hover {
        background: var(--color-primary-300);
    }
    
    .slider-dot.active {
        background: var(--color-primary-500);
        width: 24px;
        border-radius: var(--radius-full);
    }
`;

document.head.appendChild(sliderStyles);

// Export
window.CardSlider = CardSlider;
