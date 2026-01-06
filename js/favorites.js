/**
 * SMMFamy - Service Favorites System
 * Save and manage favorite services | ~150 lines
 */

const Favorites = {
    storageKey: 'favorites',

    /**
     * Get user favorites
     */
    get() {
        const user = Auth.getCurrentUser();
        if (!user) return [];

        const allFavorites = Storage.get(this.storageKey, {});
        return allFavorites[user.id] || [];
    },

    /**
     * Add service to favorites
     */
    add(serviceId) {
        const user = Auth.getCurrentUser();
        if (!user) return false;

        const allFavorites = Storage.get(this.storageKey, {});
        if (!allFavorites[user.id]) {
            allFavorites[user.id] = [];
        }

        serviceId = parseInt(serviceId);

        if (!allFavorites[user.id].includes(serviceId)) {
            allFavorites[user.id].push(serviceId);
            Storage.set(this.storageKey, allFavorites);
        }

        return true;
    },

    /**
     * Remove service from favorites
     */
    remove(serviceId) {
        const user = Auth.getCurrentUser();
        if (!user) return false;

        const allFavorites = Storage.get(this.storageKey, {});
        if (!allFavorites[user.id]) return true;

        serviceId = parseInt(serviceId);

        allFavorites[user.id] = allFavorites[user.id].filter(id => id !== serviceId);
        Storage.set(this.storageKey, allFavorites);

        return true;
    },

    /**
     * Toggle favorite status
     */
    toggle(serviceId) {
        serviceId = parseInt(serviceId);

        if (this.isFavorite(serviceId)) {
            this.remove(serviceId);
            return false;
        } else {
            this.add(serviceId);
            return true;
        }
    },

    /**
     * Check if service is favorite
     */
    isFavorite(serviceId) {
        serviceId = parseInt(serviceId);
        return this.get().includes(serviceId);
    },

    /**
     * Get favorite services
     */
    getServices() {
        const favoriteIds = this.get();
        if (!App.services) return [];

        return App.services.filter(s => favoriteIds.includes(parseInt(s.service)));
    },

    /**
     * Render favorite button
     */
    renderButton(serviceId) {
        const isFav = this.isFavorite(serviceId);

        return `
            <button class="btn btn-sm btn-ghost favorite-btn ${isFav ? 'active' : ''}" 
                    onclick="Favorites.handleClick(event, ${serviceId})"
                    title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFav ? '★' : '☆'}
            </button>
        `;
    },

    /**
     * Handle favorite click
     */
    handleClick(event, serviceId) {
        event.stopPropagation();

        const isNowFavorite = this.toggle(serviceId);
        const btn = event.target.closest('.favorite-btn');

        if (btn) {
            btn.classList.toggle('active', isNowFavorite);
            btn.textContent = isNowFavorite ? '★' : '☆';
            btn.title = isNowFavorite ? 'Remove from favorites' : 'Add to favorites';
        }

        Notify.success(isNowFavorite ? 'Added to favorites' : 'Removed from favorites');
    },

    /**
     * Get favorite count
     */
    getCount() {
        return this.get().length;
    }
};

// Export for use
window.Favorites = Favorites;
