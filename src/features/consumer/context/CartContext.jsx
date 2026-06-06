import React, { createContext, useState, useEffect, useContext } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logger from '../../../services/LoggingService';

export const CartContext = createContext();

// Enhanced cart key generation for scoping
const generateCartKey = (params) => {
  const { restaurantId, zoneId, tableId, userId } = params;
  
  // Always include user ID for cart isolation - if no userId, each session gets unique cart
  const userSessionId = userId || 'anonymous';
  
  // Create a unique key based on the context
  if (restaurantId && tableId) {
    return `cart_restaurant_${restaurantId}_table_${tableId}_user_${userSessionId}`;
  }
  
  if (zoneId && tableId) {
    return `cart_zone_${zoneId}_table_${tableId}_user_${userSessionId}`;
  }
  
  // Fallback to generic cart with session isolation
  return `cart_generic_user_${userSessionId}`;
};

// Get cart scope information
const getCartScope = (params) => {
  const { restaurantId, zoneId, tableId, userId } = params;
  
  return {
    type: restaurantId ? 'restaurant' : zoneId ? 'zone' : 'generic',
    entityId: restaurantId || zoneId,
    tableId,
    userId,
    isUserSession: !!userId && userId !== 'undefined'
  };
};

export const CartProvider = ({ children }) => {
  // Safely get Router context with fallback values
  let params = {};
  let location = { pathname: '/' };
  
  try {
    params = useParams();
    location = useLocation();
  } catch (error) {
    // Router context not available, use fallback values
    console.warn('CartProvider: Router context not available, using fallback values');
  }
  
  const { user } = useSelector((state) => state.ui.auth);
  
  // Enhanced parameters with user from Redux if available
  const enhancedParams = {
    ...params,
    userId: params.userId || user?.id
  };
  
  const cartKey = generateCartKey(enhancedParams);
  const cartScope = getCartScope(enhancedParams);
  
  // Initialize cart with empty state - no localStorage
  const [cartItems, setCartItems] = useState(() => {
    logger.debug('Cart initialized with empty state - no localStorage', {
      cartKey,
      scope: cartScope
    }, 'CartContext');

    return [];
  });
  
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartMetadata, setCartMetadata] = useState(() => ({
    scope: cartScope,
    lastUpdated: new Date().toISOString(),
    sessionId: Date.now().toString()
  }));

  // Update scope when route parameters change
  useEffect(() => {
    const newCartKey = generateCartKey(enhancedParams);
    const newScope = getCartScope(enhancedParams);
    
    // If cart scope has changed, load the appropriate cart
    if (newCartKey !== cartKey) {
      logger.debug('Cart scope changed, loading new cart', {
        oldKey: cartKey,
        newKey: newCartKey,
        oldScope: cartScope,
        newScope
      }, 'CartContext');
      
      try {
        const savedCart = localStorage.getItem(newCartKey);
        const items = savedCart ? JSON.parse(savedCart) : [];
        setCartItems(items);
        setCartMetadata({
          scope: newScope,
          lastUpdated: new Date().toISOString(),
          sessionId: Date.now().toString()
        });
      } catch (error) {
        logger.error('Failed to load new scoped cart', error, 'CartContext');
        setCartItems([]);
      }
    }
  }, [location.pathname, enhancedParams.restaurantId, enhancedParams.zoneId, enhancedParams.tableId, enhancedParams.userId]);

  // Persist cart and update metadata whenever cartItems changes
  useEffect(() => {
    // Update cart metadata and item count (no persistence)
    const updatedMetadata = {
      ...cartMetadata,
      lastUpdated: new Date().toISOString(),
      itemCount: cartItems.length
    };
    setCartMetadata(updatedMetadata);

    // Calculate total quantity across all items
    const count = cartItems.reduce((total, item) => total + item.quantity, 0);
    setCartItemCount(count);

    logger.debug('Cart updated in memory only', {
      cartKey,
      itemCount: cartItems.length,
      totalQuantity: count
    }, 'CartContext');
  }, [cartItems, cartKey]);

  const addToCart = (newItem) => {
    // Validate item has required properties
    if (!newItem.id || !newItem.name || !newItem.price) {
      logger.error('Invalid item added to cart', { item: newItem }, 'CartContext');
      return;
    }
    
    setCartItems(prevItems => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(item => item.id === newItem.id);
      
      if (existingItemIndex !== -1) {
        // Item exists, update quantity
        const updatedItems = [...prevItems];
        
        // If quantity is explicitly provided in newItem, use it
        // Otherwise add 1 to existing quantity
        if (newItem.quantity !== undefined) {
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: newItem.quantity
          };
        } else {
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + 1
          };
        }
        
        logger.debug('Cart item quantity updated', {
          itemId: newItem.id,
          newQuantity: updatedItems[existingItemIndex].quantity
        }, 'CartContext');
        
        return updatedItems;
      } else {
        // Item doesn't exist, add it with quantity (default to 1 if not specified)
        const itemToAdd = { ...newItem, quantity: newItem.quantity || 1 };
        
        logger.debug('New item added to cart', {
          itemId: newItem.id,
          quantity: itemToAdd.quantity
        }, 'CartContext');
        
        return [...prevItems, itemToAdd];
      }
    });
  };

  const removeFromCart = (itemId) => {
    setCartItems(prevItems => {
      const filteredItems = prevItems.filter(item => item.id !== itemId);
      
      logger.debug('Item removed from cart', {
        itemId,
        remainingItems: filteredItems.length
      }, 'CartContext');
      
      return filteredItems;
    });
  };

  const updateCartItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          logger.debug('Cart item quantity updated', {
            itemId,
            oldQuantity: item.quantity,
            newQuantity: quantity
          }, 'CartContext');
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const updateCartItem = (itemId, updates) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          logger.debug('Cart item updated', {
            itemId,
            updates
          }, 'CartContext');
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    
    // Clear both cart items and metadata
    try {
      localStorage.removeItem(cartKey);
      localStorage.removeItem(`${cartKey}_metadata`);
      
      logger.debug('Cart cleared', { cartKey }, 'CartContext');
    } catch (error) {
      logger.error('Failed to clear cart from localStorage', error, 'CartContext');
    }
  };
  
  // Clear cart for specific scope (useful when switching contexts)
  const clearCartForScope = (targetScope) => {
    const targetKey = generateCartKey(targetScope);
    try {
      localStorage.removeItem(targetKey);
      localStorage.removeItem(`${targetKey}_metadata`);
      
      logger.debug('Cart cleared for scope', { targetKey, targetScope }, 'CartContext');
    } catch (error) {
      logger.error('Failed to clear cart for scope', error, 'CartContext');
    }
  };
  
  // Get cart total price
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  // Check if cart is empty
  const isCartEmpty = () => {
    return cartItems.length === 0;
  };
  
  // Get item quantity by ID
  const getItemQuantity = (itemId) => {
    const item = cartItems.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider value={{
      // Core cart state
      cartItems,
      cartItemCount,
      cartMetadata,
      cartScope,
      
      // Cart operations
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      updateCartItem,
      clearCart,
      clearCartForScope,
      
      // Utility functions
      getCartTotal,
      isCartEmpty,
      getItemQuantity
    }}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook for easier cart context usage
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};