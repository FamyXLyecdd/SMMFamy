/**
 * SMMFamy - Video Player Component
 * Custom video player with controls | ~400 lines
 */

const VideoPlayer = {
    instances: new Map(),

    /**
     * Create video player
     */
    create(containerId, options = {}) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        if (!container) return null;

        const config = {
            src: '',
            poster: '',
            autoplay: false,
            loop: false,
            muted: false,
            controls: true,
            playsinline: true,
            preload: 'metadata',
            onPlay: null,
            onPause: null,
            onEnded: null,
            onTimeUpdate: null,
            onError: null,
            ...options
        };

        const player = {
            container,
            config,
            video: null,
            controls: null,
            isPlaying: false,
            isMuted: config.muted,
            isFullscreen: false,
            currentTime: 0,
            duration: 0
        };

        this.setup(player);
        this.instances.set(container, player);

        return player;
    },

    /**
     * Setup player
     */
    setup(player) {
        const { container, config } = player;

        container.classList.add('video-player');

        // Create video element
        player.video = document.createElement('video');
        player.video.src = config.src;
        player.video.poster = config.poster;
        player.video.autoplay = config.autoplay;
        player.video.loop = config.loop;
        player.video.muted = config.muted;
        player.video.playsInline = config.playsinline;
        player.video.preload = config.preload;

        container.appendChild(player.video);

        // Create controls
        if (config.controls) {
            this.createControls(player);
        }

        // Video events
        player.video.addEventListener('loadedmetadata', () => {
            player.duration = player.video.duration;
            this.updateDuration(player);
        });

        player.video.addEventListener('timeupdate', () => {
            player.currentTime = player.video.currentTime;
            this.updateProgress(player);
            if (config.onTimeUpdate) config.onTimeUpdate(player.currentTime);
        });

        player.video.addEventListener('play', () => {
            player.isPlaying = true;
            this.updatePlayButton(player);
            if (config.onPlay) config.onPlay();
        });

        player.video.addEventListener('pause', () => {
            player.isPlaying = false;
            this.updatePlayButton(player);
            if (config.onPause) config.onPause();
        });

        player.video.addEventListener('ended', () => {
            player.isPlaying = false;
            this.updatePlayButton(player);
            if (config.onEnded) config.onEnded();
        });

        player.video.addEventListener('error', () => {
            console.error('Video error:', player.video.error);
            if (config.onError) config.onError(player.video.error);
        });

        // Click to play/pause
        player.video.addEventListener('click', () => {
            this.togglePlay(player);
        });

        // Double-click to fullscreen
        player.video.addEventListener('dblclick', () => {
            this.toggleFullscreen(player);
        });

        // Keyboard controls
        container.setAttribute('tabindex', '0');
        container.addEventListener('keydown', (e) => {
            this.handleKeyboard(player, e);
        });
    },

    /**
     * Create controls
     */
    createControls(player) {
        const controls = document.createElement('div');
        controls.className = 'video-controls';

        controls.innerHTML = `
            <div class="video-progress">
                <div class="progress-bar">
                    <div class="progress-filled"></div>
                    <div class="progress-buffered"></div>
                </div>
            </div>
            <div class="video-buttons">
                <button class="control-btn play-btn">▶</button>
                <button class="control-btn volume-btn">🔊</button>
                <input type="range" class="volume-slider" min="0" max="100" value="100">
                <span class="time-display">
                    <span class="current-time">0:00</span>
                    <span>/</span>
                    <span class="duration">0:00</span>
                </span>
                <div class="control-spacer"></div>
                <button class="control-btn settings-btn">⚙️</button>
                <button class="control-btn fullscreen-btn">⛶</button>
            </div>
        `;

        player.container.appendChild(controls);
        player.controls = controls;

        // Control event listeners
        controls.querySelector('.play-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlay(player);
        });

        controls.querySelector('.volume-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute(player);
        });

        controls.querySelector('.volume-slider').addEventListener('input', (e) => {
            e.stopPropagation();
            this.setVolume(player, e.target.value / 100);
        });

        controls.querySelector('.fullscreen-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFullscreen(player);
        });

        // Progress bar click
        controls.querySelector('.progress-bar').addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seek(player, percent * player.duration);
        });

        // Show/hide controls
        let hideTimeout;
        player.container.addEventListener('mousemove', () => {
            controls.classList.add('visible');
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                if (player.isPlaying) {
                    controls.classList.remove('visible');
                }
            }, 3000);
        });

        player.container.addEventListener('mouseleave', () => {
            if (player.isPlaying) {
                controls.classList.remove('visible');
            }
        });
    },

    /**
     * Toggle play/pause
     */
    togglePlay(player) {
        if (player.isPlaying) {
            player.video.pause();
        } else {
            player.video.play();
        }
    },

    /**
     * Toggle mute
     */
    toggleMute(player) {
        player.isMuted = !player.isMuted;
        player.video.muted = player.isMuted;
        this.updateVolumeButton(player);
    },

    /**
     * Set volume
     */
    setVolume(player, volume) {
        player.video.volume = Math.max(0, Math.min(1, volume));
        player.isMuted = volume === 0;
        player.video.muted = player.isMuted;
        this.updateVolumeButton(player);
    },

    /**
     * Seek to time
     */
    seek(player, time) {
        player.video.currentTime = Math.max(0, Math.min(player.duration, time));
    },

    /**
     * Toggle fullscreen
     */
    toggleFullscreen(player) {
        if (!document.fullscreenElement) {
            player.container.requestFullscreen().then(() => {
                player.isFullscreen = true;
            });
        } else {
            document.exitFullscreen().then(() => {
                player.isFullscreen = false;
            });
        }
    },

    /**
     * Update play button
     */
    updatePlayButton(player) {
        const btn = player.controls?.querySelector('.play-btn');
        if (btn) {
            btn.textContent = player.isPlaying ? '⏸' : '▶';
        }
    },

    /**
     * Update volume button
     */
    updateVolumeButton(player) {
        const btn = player.controls?.querySelector('.volume-btn');
        if (btn) {
            btn.textContent = player.isMuted ? '🔇' : '🔊';
        }
    },

    /**
     * Update progress
     */
    updateProgress(player) {
        const filled = player.controls?.querySelector('.progress-filled');
        const currentTime = player.controls?.querySelector('.current-time');

        if (filled) {
            const percent = (player.currentTime / player.duration) * 100;
            filled.style.width = `${percent}%`;
        }

        if (currentTime) {
            currentTime.textContent = this.formatTime(player.currentTime);
        }
    },

    /**
     * Update duration display
     */
    updateDuration(player) {
        const duration = player.controls?.querySelector('.duration');
        if (duration) {
            duration.textContent = this.formatTime(player.duration);
        }
    },

    /**
     * Format time as mm:ss
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Handle keyboard controls
     */
    handleKeyboard(player, e) {
        switch (e.key) {
            case ' ':
            case 'k':
                e.preventDefault();
                this.togglePlay(player);
                break;
            case 'm':
                this.toggleMute(player);
                break;
            case 'f':
                this.toggleFullscreen(player);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.seek(player, player.currentTime - 10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.seek(player, player.currentTime + 10);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.setVolume(player, player.video.volume + 0.1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.setVolume(player, player.video.volume - 0.1);
                break;
        }
    },

    /**
     * Load new source
     */
    load(containerId, src) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        const player = this.instances.get(container);
        if (!player) return;

        player.video.src = src;
        player.video.load();
    },

    /**
     * Destroy player
     */
    destroy(containerId) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        const player = this.instances.get(container);
        if (!player) return;

        player.video.pause();
        container.innerHTML = '';
        container.classList.remove('video-player');
        this.instances.delete(container);
    }
};

// Styles
const videoStyles = document.createElement('style');
videoStyles.textContent = `
    .video-player {
        position: relative;
        background: black;
        border-radius: var(--radius-lg);
        overflow: hidden;
    }
    
    .video-player video {
        width: 100%;
        height: auto;
        display: block;
    }
    
    .video-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
        padding: var(--space-4);
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .video-controls.visible,
    .video-player:hover .video-controls {
        opacity: 1;
    }
    
    .video-progress {
        margin-bottom: var(--space-2);
    }
    
    .progress-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: var(--radius-full);
        cursor: pointer;
        position: relative;
    }
    
    .progress-bar:hover {
        height: 6px;
    }
    
    .progress-filled {
        height: 100%;
        background: var(--color-primary-500);
        border-radius: var(--radius-full);
        position: absolute;
        top: 0;
        left: 0;
    }
    
    .progress-buffered {
        height: 100%;
        background: rgba(255, 255, 255, 0.2);
        border-radius: var(--radius-full);
        position: absolute;
        top: 0;
        left: 0;
    }
    
    .video-buttons {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }
    
    .control-btn {
        width: 32px;
        height: 32px;
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        border-radius: var(--radius-md);
        transition: background 0.2s;
    }
    
    .control-btn:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .volume-slider {
        width: 60px;
        height: 4px;
        accent-color: var(--color-primary-500);
    }
    
    .time-display {
        color: white;
        font-size: var(--text-sm);
        margin-left: var(--space-2);
    }
    
    .control-spacer {
        flex: 1;
    }
    
    .video-player:fullscreen {
        border-radius: 0;
    }
`;

document.head.appendChild(videoStyles);

// Export
window.VideoPlayer = VideoPlayer;
