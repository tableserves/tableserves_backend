/**
 * Enhanced URL Utility Functions for TableServe Customer Flow
 * Provides consistent URL generation with proper user ID handling
 */

/**
 * Validates and normalizes user ID
 * @param {string} userId - The user ID to validate
 * @returns {string|null} - Normalized user ID or null if invalid
 */
const normalizeUserId = (userId) => {
    if (!userId || userId === 'undefined' || userId === 'null') {
        return null;
    }
    return userId;
};

/**
 * Generates a restaurant URL with proper user ID handling
 * @param {string} restaurantId - The restaurant ID
 * @param {string} tableId - The table ID
 * @param {string} userId - The user ID (can be undefined)
 * @param {string} path - Additional path segments
 * @returns {string} - The properly formatted URL
 */
export const generateRestaurantUrl = (restaurantId, tableId, userId, path = '') => {
    const normalizedUserId = normalizeUserId(userId);
    const pathSegment = path ? `/${path}` : '';
    
    if (normalizedUserId) {
        return `/tableserve/restaurant/${restaurantId}/table/${tableId}/user/${normalizedUserId}${pathSegment}`;
    }
    
    return `/tableserve/restaurant/${restaurantId}/table/${tableId}${pathSegment}`;
};

/**
 * Generates a zone URL with proper handling of undefined user IDs
 * @param {string} zoneId - The zone ID
 * @param {string} tableId - The table ID
 * @param {string} userId - The user ID (can be undefined)
 * @param {string} path - Additional path segments
 * @returns {string} - The properly formatted URL
 */
export const generateZoneUrl = (zoneId, tableId, userId, path = '') => {
    const normalizedUserId = normalizeUserId(userId);
    const pathSegment = path ? `/${path}` : '';
    
    if (normalizedUserId) {
        return `/tableserve/zone/${zoneId}/table/${tableId}/user/${normalizedUserId}${pathSegment}`;
    }
    
    return `/tableserve/zone/${zoneId}/table/${tableId}${pathSegment}`;
};

/**
 * Generates a shop URL with proper handling of undefined user IDs
 * @param {string} zoneId - The zone ID
 * @param {string} tableId - The table ID
 * @param {string} userId - The user ID (can be undefined)
 * @param {string} shopId - The shop ID
 * @param {string} path - Additional path segments
 * @returns {string} - The properly formatted URL
 */
export const generateShopUrl = (zoneId, tableId, userId, shopId, path = '') => {
    const normalizedUserId = normalizeUserId(userId);
    const pathSegment = path ? `/${path}` : '';
    
    if (normalizedUserId) {
        return `/tableserve/zone/${zoneId}/table/${tableId}/user/${normalizedUserId}/shop/${shopId}${pathSegment}`;
    }
    
    return `/tableserve/zone/${zoneId}/table/${tableId}/shop/${shopId}${pathSegment}`;
};

/**
 * Generates the appropriate URL based on context (restaurant or zone)
 * @param {object} params - URL parameters
 * @param {string} params.restaurantId - Restaurant ID
 * @param {string} params.zoneId - Zone ID
 * @param {string} params.tableId - Table ID
 * @param {string} params.userId - User ID
 * @param {string} params.shopId - Shop ID (for zones)
 * @param {string} path - Target path
 * @returns {string} - Generated URL
 */
export const generateContextualUrl = (params, path = '') => {
    const { restaurantId, zoneId, tableId, userId, shopId } = params;
    
    // Zone with specific shop
    if (zoneId && shopId) {
        return generateShopUrl(zoneId, tableId, userId, shopId, path);
    }
    
    // Zone general
    if (zoneId) {
        return generateZoneUrl(zoneId, tableId, userId, path);
    }
    
    // Restaurant
    if (restaurantId) {
        return generateRestaurantUrl(restaurantId, tableId, userId, path);
    }
    
    console.error('Unable to generate contextual URL - missing required parameters', params);
    return '/';
};

/**
 * Cleans URLs by removing undefined/null user segments
 * @param {string} url - The URL to clean
 * @returns {string} - Cleaned URL
 */
export const cleanUrl = (url) => {
    return url.replace(/\/user\/(undefined|null)(?=\/|$)/g, '');
};

/**
 * Validates if a URL has valid parameters
 * @param {object} params - URL parameters to validate
 * @returns {object} - Validation result
 */
export const validateUrlParams = (params) => {
    const { restaurantId, zoneId, tableId } = params;
    
    const errors = [];
    
    if (!tableId) {
        errors.push('Table ID is required');
    }
    
    if (!restaurantId && !zoneId) {
        errors.push('Either Restaurant ID or Zone ID is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        hasRestaurant: !!restaurantId,
        hasZone: !!zoneId
    };
};