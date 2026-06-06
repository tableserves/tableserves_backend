/**
 * Order Type Utilities
 * Order types: 'restaurant' (single restaurant order) or 'zone' (single shop within a zone).
 */

export const determineOrderType = (orderData) => {
  if (!orderData) return 'unknown';

  const zoneId = orderData.zoneId?._id || orderData.zoneId || orderData.zone?._id || orderData.zone?.id;
  const restaurantId = orderData.restaurantId?._id || orderData.restaurantId || orderData.restaurant?._id || orderData.restaurant?.id;

  if (zoneId) return 'zone';
  if (restaurantId) return 'restaurant';
  return 'unknown';
};

export const extractNavigationContext = (orderData) => {
  if (!orderData) {
    return { zoneId: undefined, restaurantId: undefined, shopId: undefined, orderType: 'unknown' };
  }

  const zoneId = orderData.zoneId?._id || orderData.zoneId || orderData.zone?._id || orderData.zone?.id;
  const restaurantId = orderData.restaurantId?._id || orderData.restaurantId || orderData.restaurant?._id || orderData.restaurant?.id;
  const shopId = orderData.shopId?._id || orderData.shopId || orderData.shop?._id || orderData.shop?.id;

  return { zoneId, restaurantId, shopId, orderType: determineOrderType(orderData) };
};

export const generateHomeNavigationUrl = (orderData) => {
  const { zoneId, restaurantId, shopId } = extractNavigationContext(orderData);
  const tableNumber = orderData?.tableNumber || 'unknown';
  const userId = orderData?.customer?.userId || 'guest';

  if (zoneId && shopId) {
    return `/zone/${zoneId}/table/${tableNumber}/user/${userId}/shop/${shopId}/menu`;
  }
  if (zoneId) {
    return `/zone/${zoneId}/table/${tableNumber}/user/${userId}/shops`;
  }
  if (restaurantId) {
    return `/restaurant/${restaurantId}/table/${tableNumber}/user/${userId}/menu`;
  }
  return '/tableserve';
};

export const isZoneOrder = (orderData) => determineOrderType(orderData) === 'zone';
export const isRestaurantOrder = (orderData) => determineOrderType(orderData) === 'restaurant';

export const getOrderTypeDescription = (orderData) => {
  switch (determineOrderType(orderData)) {
    case 'restaurant': return 'Restaurant Order';
    case 'zone': return 'Zone Shop Order';
    default: return 'Unknown Order Type';
  }
};
