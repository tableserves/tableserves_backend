// Middleware to save menu items to localStorage with the correct key
const menuItemsMiddleware = store => next => action => {
    // Process the action first
    const result = next(action);

    // Check if the action is related to menu items
    if (
        action.type === 'menuItems/addItem' ||
        action.type === 'menuItems/updateItem' ||
        action.type === 'menuItems/deleteItem' ||
        action.type === 'menuItems/setItems'
    ) {
        // Get the current state
        const state = store.getState();
        const { menuItems } = state;

        // Get the shopId/restaurantId from the action payload or from the auth state
        let entityId, entityType;

        if (action.payload && action.payload.shopId) {
            entityId = action.payload.shopId;
            entityType = 'vendor';
        } else if (action.payload && action.payload.restaurantId) {
            entityId = action.payload.restaurantId;
            entityType = 'restaurant';
        } else if (state.auth && state.auth.user) {
            if (state.auth.user.restaurantId) {
                entityId = state.auth.user.restaurantId;
                entityType = 'restaurant';
            } else if (state.auth.user.shopId) {
                entityId = state.auth.user.shopId;
                entityType = 'vendor';
            }
        }

        if (entityId) {
            // Save menu items to localStorage with the correct key
            const key = entityType === 'restaurant' ? `restaurant_menu_items_${entityId}` : `vendor_menu_items_${entityId}`;
            const menuItemsToSave = menuItems.dishes || menuItems.items || [];
            localStorage.setItem(key, JSON.stringify(menuItemsToSave));
            console.log(`Saved menu items to localStorage with key: ${key}`, menuItemsToSave);

            // Also update the entity object itself if it's a restaurant
            if (entityType === 'restaurant') {
                const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
                const restaurantIndex = restaurants.findIndex(r => r.id == entityId);
                if (restaurantIndex !== -1) {
                    restaurants[restaurantIndex].menuItems = menuItemsToSave;
                    localStorage.setItem('tableserve_restaurants', JSON.stringify(restaurants));
                }
            }
        }
    }

    return result;
};

export default menuItemsMiddleware;