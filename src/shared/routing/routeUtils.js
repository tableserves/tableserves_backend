// Utility functions for generating proper route paths based on available parameters

/**
 * Generate a proper route path based on available URL parameters
 * @param {string} restaurantId - Restaurant ID from params
 * @param {string} tableId - Table ID from params  
 * @param {string} userId - User ID from params
 * @param {string} zoneId - Zone ID from params
 * @param {string} page - The target page (menu, cart, checkout, etc.)
 * @returns {string} The properly formatted route path
 */
export const generateRoutePath = (restaurantId, tableId, userId, zoneId, page) => {
    // Zone-based routes with user
    if (zoneId && tableId && userId) {
        return `/zone/${zoneId}/table/${tableId}/user/${userId}/${page}`;
    }

    // Zone-based routes without user
    if (zoneId && tableId) {
        return `/zone/${zoneId}/table/${tableId}/${page}`;
    }

    // Restaurant-based routes with user
    if (restaurantId && tableId && userId) {
        return `/restaurant/${restaurantId}/table/${tableId}/user/${userId}/${page}`;
    }

    // Restaurant-based routes without user
    if (restaurantId && tableId) {
        return `/restaurant/${restaurantId}/table/${tableId}/${page}`;
    }

    // Fallback to home page if no valid parameters
    console.error('Unable to generate route path - missing required parameters', {
        restaurantId, tableId, userId, zoneId, page
    });
    return '/';
};

/**
 * Debug log route parameters for troubleshooting
 * @param {string} componentName - Name of the component for logging context
 * @param {object} params - Parameters object from useParams()
 */
export const debugRouteParams = (componentName, params) => {
    console.log(`${componentName} route params:`, params);

    if (!params.restaurantId && !params.zoneId) {
        console.warn(`${componentName}: No restaurantId or zoneId found in params`);
    }

    if (!params.tableId) {
        console.warn(`${componentName}: No tableId found in params`);
    }

    if (!params.userId && params.zoneId) {
        console.info(`${componentName}: No userId in zone route (normal for first-time users)`);
    }
};

/**
 * Generate a new user ID for first-time zone users
 * @returns {string} New user ID
 */
export const generateUserId = () => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
};