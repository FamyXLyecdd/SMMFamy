/**
 * SMMFamy - SMMGen API Wrapper
 * Direct API integration - mirrors SMMGen categories and services exactly
 * ~400 lines
 */

const SMMApi = {
    // API Configuration - Use proxy for CORS bypass
    apiUrl: 'https://smmgen.com/api/v2',
    // Consolidated server handles both static and API on same port
    proxyUrl: '/api/smmgen',
    apiKey: 'c4bef138daa72a2bdf56ab47edb55ef5',

    // Currency Configuration
    currency: 'PHP',
    currencySymbol: '₱',
    phpRate: 56, // 1 USD = 56 PHP (adjustable in admin)

    // Markup Configuration
    profitMultiplier: 2.5, // 150% profit margin

    // Always use real API - no mock mode
    mockMode: false,

    /**
     * Make API request via proxy (bypasses CORS)
     */
    async request(action, data = {}) {
        try {
            // Use proxy endpoint to bypass CORS
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    ...data
                })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Mock API request for testing
     */
    async mockRequest(action, data) {
        await Utils.sleep(300 + Math.random() * 500); // Simulate network delay

        switch (action) {
            case 'services':
                return this.getMockServices();
            case 'add':
                return { order: Math.floor(Math.random() * 900000) + 100000 };
            case 'status':
                return { status: 'In progress', charge: '0.50', start_count: data.order, remains: 0 };
            case 'balance':
                return { balance: '150.00', currency: 'USD' };
            default:
                return { success: true };
        }
    },

    /**
     * Get services from API
     */
    async getServices() {
        const data = await this.request('services');

        // Convert and add markup to prices
        if (!Array.isArray(data)) {
            console.error('API Error: Expected array of services, got:', data);
            throw new Error('Invalid API response format');
        }

        // Convert and add markup to prices
        return data.map(service => {
            try {
                return {
                    ...service,
                    min: Math.max(250, parseInt(service.min) || 0),
                    originalRate: parseFloat(service.rate),
                    rate: this.getPricePer1000(service.rate),
                    category: service.category || 'Other',
                    description: this.getServiceDescription(service)
                };
            } catch (err) {
                console.error('Error processing service:', service, err);
                return null;
            }
        }).filter(s => s !== null);
    },

    /**
     * Create order
     */
    async createOrder(orderData) {
        return this.request('add', {
            service: orderData.service,
            link: orderData.link,
            quantity: orderData.quantity,
            comments: orderData.comments,
            username: orderData.username
        });
    },

    /**
     * Get order status
     */
    async getOrderStatus(orderId) {
        return this.request('status', { order: orderId });
    },

    /**
     * Get API balance
     */
    async getBalance() {
        return this.request('balance');
    },

    /**
     * Refill order
     */
    async refillOrder(orderId) {
        return this.request('refill', { order: orderId });
    },

    /**
     * Cancel order
     */
    async cancelOrder(orderId) {
        return this.request('cancel', { orders: orderId });
    },

    /**
     * Convert USD to PHP and apply markup
     */
    getPricePer1000(usdPrice) {
        const basePhp = parseFloat(usdPrice) * this.phpRate;
        const withMarkup = basePhp * this.profitMultiplier;
        return this.roundToFlat(withMarkup);
    },

    /**
     * Round to flat/friendly price
     */
    roundToFlat(price) {
        // Round to nearest .00, .25, .49, .50, .75, .99
        const flatPoints = [0.00, 0.25, 0.49, 0.50, 0.75, 0.99];
        const whole = Math.floor(price);
        const decimal = price - whole;

        let closest = flatPoints[0];
        let minDiff = Math.abs(decimal - flatPoints[0]);

        for (const point of flatPoints) {
            const diff = Math.abs(decimal - point);
            if (diff < minDiff) {
                minDiff = diff;
                closest = point;
            }
        }

        // Round up slightly for .99 cases
        if (closest === 0.00 && decimal > 0.5) {
            return whole + 1;
        }

        return whole + closest;
    },

    /**
     * Format price for display
     */
    formatPrice(amount) {
        return this.currencySymbol + parseFloat(amount).toFixed(2);
    },

    /**
     * Calculate order total
     */
    calculateTotal(pricePerK, quantity) {
        const total = (pricePerK / 1000) * quantity;
        return this.roundToFlat(total);
    },

    /**
     * Get service description
     */
    getServiceDescription(service) {
        const name = service.name.toLowerCase();
        const descriptions = {
            'followers': 'Real-looking followers with profile pictures. Safe for your account.',
            'likes': 'High-quality likes from active accounts. Fast delivery.',
            'views': 'Real video views with high retention. Helps with algorithm.',
            'comments': 'Custom or random comments from real-looking accounts.',
            'subscribers': 'Real YouTube subscribers. Helps with monetization.',
            'watch time': '4000+ hours watch time for monetization requirements.',
            'shares': 'Social shares to boost your content reach.',
            'saves': 'Saves help boost your content in the algorithm.',
            'story views': 'Views on your Instagram/Facebook stories.',
            'live views': 'Viewers for your live streams.',
            'members': 'Group/channel members for Telegram, Discord, etc.',
            'default': 'Quality service with fast delivery and refill guarantee.'
        };

        for (const [key, desc] of Object.entries(descriptions)) {
            if (name.includes(key)) return desc;
        }

        return descriptions.default;
    },

    /**
     * Get platform icon path
     */
    getPlatformIcon(category) {
        const platform = category.toLowerCase();
        const icons = {
            instagram: 'assets/logos/instagram.svg',
            tiktok: 'assets/logos/tiktok.svg',
            youtube: 'assets/logos/youtube.svg',
            facebook: 'assets/logos/facebook.svg',
            twitter: 'assets/logos/twitter.svg',
            telegram: 'assets/logos/telegram.svg',
            spotify: 'assets/logos/spotify.svg',
            discord: 'assets/logos/discord.svg',
            twitch: 'assets/logos/twitch.svg',
            linkedin: 'assets/logos/linkedin.svg'
        };

        for (const [key, path] of Object.entries(icons)) {
            if (platform.includes(key)) return path;
        }

        return null;
    },

    /**
     * Get mock services data
     */
    getMockServices() {
        return [
            // Instagram Services
            { service: 1001, name: 'Instagram Followers - HQ', category: 'Instagram Followers', min: 100, max: 100000, rate: 0.15, refill: true },
            { service: 1002, name: 'Instagram Followers - Premium', category: 'Instagram Followers', min: 50, max: 50000, rate: 0.25, refill: true },
            { service: 1003, name: 'Instagram Followers - Real Filipino', category: 'Instagram Followers', min: 100, max: 10000, rate: 0.45, refill: true },
            { service: 1004, name: 'Instagram Followers - Female', category: 'Instagram Followers', min: 100, max: 50000, rate: 0.35, refill: false },
            { service: 1005, name: 'Instagram Likes - Post', category: 'Instagram Likes', min: 50, max: 100000, rate: 0.08, refill: false },
            { service: 1006, name: 'Instagram Likes - Reel', category: 'Instagram Likes', min: 50, max: 100000, rate: 0.10, refill: false },
            { service: 1007, name: 'Instagram Likes - Story', category: 'Instagram Likes', min: 50, max: 10000, rate: 0.12, refill: false },
            { service: 1008, name: 'Instagram Views - Video', category: 'Instagram Views', min: 100, max: 10000000, rate: 0.01, refill: false },
            { service: 1009, name: 'Instagram Views - Reel', category: 'Instagram Views', min: 100, max: 10000000, rate: 0.015, refill: false },
            { service: 1010, name: 'Instagram Views - Story', category: 'Instagram Views', min: 50, max: 100000, rate: 0.02, refill: false },
            { service: 1011, name: 'Instagram Comments - Random', category: 'Instagram Comments', min: 10, max: 5000, rate: 0.80, refill: false },
            { service: 1012, name: 'Instagram Comments - Custom', category: 'Instagram Comments', min: 5, max: 1000, rate: 1.50, refill: false },
            { service: 1013, name: 'Instagram Saves', category: 'Instagram Engagement', min: 50, max: 50000, rate: 0.15, refill: false },
            { service: 1014, name: 'Instagram Shares', category: 'Instagram Engagement', min: 50, max: 50000, rate: 0.18, refill: false },
            { service: 1015, name: 'Instagram Live Views', category: 'Instagram Live', min: 50, max: 10000, rate: 0.50, refill: false },

            // TikTok Services
            { service: 2001, name: 'TikTok Followers - HQ', category: 'TikTok Followers', min: 100, max: 100000, rate: 0.18, refill: true },
            { service: 2002, name: 'TikTok Followers - Premium', category: 'TikTok Followers', min: 50, max: 50000, rate: 0.30, refill: true },
            { service: 2003, name: 'TikTok Followers - Real', category: 'TikTok Followers', min: 100, max: 10000, rate: 0.50, refill: true },
            { service: 2004, name: 'TikTok Likes - Fast', category: 'TikTok Likes', min: 100, max: 100000, rate: 0.06, refill: false },
            { service: 2005, name: 'TikTok Likes - Premium', category: 'TikTok Likes', min: 50, max: 50000, rate: 0.12, refill: false },
            { service: 2006, name: 'TikTok Views', category: 'TikTok Views', min: 100, max: 10000000, rate: 0.005, refill: false },
            { service: 2007, name: 'TikTok Views - High Retention', category: 'TikTok Views', min: 100, max: 1000000, rate: 0.02, refill: false },
            { service: 2008, name: 'TikTok Shares', category: 'TikTok Engagement', min: 50, max: 50000, rate: 0.10, refill: false },
            { service: 2009, name: 'TikTok Saves', category: 'TikTok Engagement', min: 50, max: 50000, rate: 0.12, refill: false },
            { service: 2010, name: 'TikTok Comments - Random', category: 'TikTok Comments', min: 10, max: 5000, rate: 0.90, refill: false },
            { service: 2011, name: 'TikTok Live Views', category: 'TikTok Live', min: 50, max: 10000, rate: 0.55, refill: false },

            // YouTube Services
            { service: 3001, name: 'YouTube Subscribers - HQ', category: 'YouTube Subscribers', min: 100, max: 50000, rate: 0.80, refill: true },
            { service: 3002, name: 'YouTube Subscribers - Premium', category: 'YouTube Subscribers', min: 50, max: 10000, rate: 1.50, refill: true },
            { service: 3003, name: 'YouTube Views', category: 'YouTube Views', min: 500, max: 10000000, rate: 0.10, refill: false },
            { service: 3004, name: 'YouTube Views - High Retention', category: 'YouTube Views', min: 500, max: 1000000, rate: 0.30, refill: false },
            { service: 3005, name: 'YouTube Watch Time (4000 Hours)', category: 'YouTube Watch Time', min: 1, max: 10, rate: 50.00, refill: false },
            { service: 3006, name: 'YouTube Likes', category: 'YouTube Likes', min: 50, max: 100000, rate: 0.20, refill: false },
            { service: 3007, name: 'YouTube Comments - Random', category: 'YouTube Comments', min: 10, max: 5000, rate: 1.00, refill: false },
            { service: 3008, name: 'YouTube Shorts Views', category: 'YouTube Shorts', min: 100, max: 10000000, rate: 0.015, refill: false },
            { service: 3009, name: 'YouTube Shorts Likes', category: 'YouTube Shorts', min: 50, max: 100000, rate: 0.12, refill: false },
            { service: 3010, name: 'YouTube Live Viewers', category: 'YouTube Live', min: 50, max: 10000, rate: 0.80, refill: false },

            // Facebook Services
            { service: 4001, name: 'Facebook Page Likes', category: 'Facebook Page', min: 100, max: 100000, rate: 0.25, refill: true },
            { service: 4002, name: 'Facebook Page Followers', category: 'Facebook Page', min: 100, max: 100000, rate: 0.20, refill: true },
            { service: 4003, name: 'Facebook Post Likes', category: 'Facebook Post', min: 50, max: 50000, rate: 0.08, refill: false },
            { service: 4004, name: 'Facebook Post Comments', category: 'Facebook Post', min: 10, max: 5000, rate: 0.80, refill: false },
            { service: 4005, name: 'Facebook Post Shares', category: 'Facebook Post', min: 50, max: 50000, rate: 0.15, refill: false },
            { service: 4006, name: 'Facebook Video Views', category: 'Facebook Video', min: 100, max: 10000000, rate: 0.02, refill: false },
            { service: 4007, name: 'Facebook Live Viewers', category: 'Facebook Live', min: 50, max: 10000, rate: 0.60, refill: false },
            { service: 4008, name: 'Facebook Group Members', category: 'Facebook Group', min: 100, max: 50000, rate: 0.30, refill: false },

            // Twitter Services
            { service: 5001, name: 'Twitter Followers', category: 'Twitter Followers', min: 100, max: 100000, rate: 0.20, refill: true },
            { service: 5002, name: 'Twitter Followers - Premium', category: 'Twitter Followers', min: 50, max: 20000, rate: 0.40, refill: true },
            { service: 5003, name: 'Twitter Likes', category: 'Twitter Engagement', min: 50, max: 100000, rate: 0.10, refill: false },
            { service: 5004, name: 'Twitter Retweets', category: 'Twitter Engagement', min: 50, max: 100000, rate: 0.12, refill: false },
            { service: 5005, name: 'Twitter Views', category: 'Twitter Views', min: 100, max: 10000000, rate: 0.008, refill: false },
            { service: 5006, name: 'Twitter Comments', category: 'Twitter Engagement', min: 10, max: 5000, rate: 0.90, refill: false },

            // Telegram Services
            { service: 6001, name: 'Telegram Channel Members', category: 'Telegram', min: 100, max: 100000, rate: 0.25, refill: false },
            { service: 6002, name: 'Telegram Group Members', category: 'Telegram', min: 100, max: 100000, rate: 0.30, refill: false },
            { service: 6003, name: 'Telegram Post Views', category: 'Telegram', min: 100, max: 1000000, rate: 0.01, refill: false },
            { service: 6004, name: 'Telegram Reactions', category: 'Telegram', min: 50, max: 50000, rate: 0.08, refill: false },

            // Spotify Services
            { service: 7001, name: 'Spotify Followers - Artist', category: 'Spotify', min: 100, max: 100000, rate: 0.35, refill: false },
            { service: 7002, name: 'Spotify Followers - Playlist', category: 'Spotify', min: 100, max: 100000, rate: 0.30, refill: false },
            { service: 7003, name: 'Spotify Plays', category: 'Spotify', min: 1000, max: 10000000, rate: 0.50, refill: false },
            { service: 7004, name: 'Spotify Monthly Listeners', category: 'Spotify', min: 100, max: 100000, rate: 0.40, refill: false },

            // Discord Services
            { service: 8001, name: 'Discord Server Members', category: 'Discord', min: 100, max: 50000, rate: 0.40, refill: false },
            { service: 8002, name: 'Discord Server Members - Online', category: 'Discord', min: 50, max: 10000, rate: 0.80, refill: false }
        ];
    }
};

// Export for use
window.SMMApi = SMMApi;
