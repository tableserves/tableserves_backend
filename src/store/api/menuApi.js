/**
 * Menu API Slice for TableServe Application
 * 
 * Handles all menu-related API operations using RTK Query
 */

import { api } from './baseApi';

export const menuApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ===== MENU CATEGORIES =====

    // Get menu categories for restaurant
    getMenuCategories: builder.query({
      query: ({ restaurantId, zoneId, shopId, vendorId, isPublic = true }) => {
        let url;
        if (restaurantId) {
          url = isPublic 
            ? `/menus/public/restaurant/${restaurantId}/categories`
            : `/menus/restaurant/${restaurantId}/categories`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/categories`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/categories`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/categories`;
        }

        return url;
      },
      providesTags: (result, error, { restaurantId, zoneId, shopId, vendorId }) => [
        { type: 'MenuCategory', id: restaurantId || zoneId || shopId || vendorId },
        'MenuCategory',
      ],
      transformResponse: (response) => {
        return response.data || response || [];
      },
    }),

    // Create menu category
    createMenuCategory: builder.mutation({
      query: ({ restaurantId, zoneId, shopId, vendorId, categoryData }) => {
        let url;
        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/categories`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/categories`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/categories`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/categories`;
        }

        return {
          url,
          method: 'POST',
          body: categoryData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, shopId, vendorId }) => [
        { type: 'MenuCategory', id: restaurantId || zoneId || shopId || vendorId },
        'MenuCategory',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update menu category
    updateMenuCategory: builder.mutation({
      query: ({ restaurantId, zoneId, shopId, vendorId, categoryId, categoryData }) => {
        let url;
        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/categories/${categoryId}`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/categories/${categoryId}`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/categories/${categoryId}`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/categories/${categoryId}`;
        }
        
        return {
          url,
          method: 'PUT',
          body: categoryData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, shopId, vendorId, categoryId }) => [
        { type: 'MenuCategory', id: categoryId },
        { type: 'MenuCategory', id: restaurantId || zoneId || shopId || vendorId },
        'MenuCategory',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Delete menu category
    deleteMenuCategory: builder.mutation({
      query: ({ restaurantId, zoneId, shopId, vendorId, categoryId }) => {
        let url;
        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/categories/${categoryId}`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/categories/${categoryId}`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/categories/${categoryId}`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/categories/${categoryId}`;
        }
        
        return {
          url,
          method: 'DELETE',
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, shopId, vendorId }) => [
        { type: 'MenuCategory', id: restaurantId || zoneId || shopId || vendorId },
        'MenuCategory',
        'MenuItem', // Categories affect items
      ],
      transformResponse: (response) => {
        return response.data || { success: true };
      },
    }),

    // ===== MENU ITEMS =====

    // Get menu items
    getMenuItems: builder.query({
      query: ({ restaurantId, zoneId, vendorId, shopId, categoryId, page = 1, limit = 10, search = '', isPublic = true }) => {
        let url;

        if (restaurantId) {
          url = isPublic 
            ? `/menus/public/restaurant/${restaurantId}/items` 
            : `/menus/restaurant/${restaurantId}/items`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/items`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/items`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/items`; // vendors are shops in the backend
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(categoryId && { categoryId })
        });

        return `${url}?${params}`;
      },
      providesTags: (result, error, { restaurantId, zoneId, vendorId }) => [
        { type: 'MenuItem', id: restaurantId || zoneId || vendorId },
        'MenuItem',
      ],
      transformResponse: (response) => {
        return response.data || response || [];
      },
    }),

    // Create menu item
    createMenuItem: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, shopId, itemData }) => {
        let url;

        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/items`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/items`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/items`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/items`; // vendors are shops in the backend
        }

        return {
          url,
          method: 'POST',
          body: itemData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId }) => [
        { type: 'MenuItem', id: restaurantId || zoneId || vendorId },
        'MenuItem',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update menu item
    updateMenuItem: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, shopId, itemId, itemData }) => {
        let url;

        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/items/${itemId}`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/items/${itemId}`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/items/${itemId}`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/items/${itemId}`;
        }

        return {
          url,
          method: 'PUT',
          body: itemData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId, shopId, itemId }) => [
        { type: 'MenuItem', id: itemId },
        { type: 'MenuItem', id: restaurantId || zoneId || vendorId || shopId },
        'MenuItem',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Delete menu item
    deleteMenuItem: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, shopId, itemId }) => {
        let url;

        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/items/${itemId}`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/items/${itemId}`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/items/${itemId}`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/items/${itemId}`;
        }

        return {
          url,
          method: 'DELETE',
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId, shopId, itemId }) => [
        { type: 'MenuItem', id: itemId },
        { type: 'MenuItem', id: restaurantId || zoneId || vendorId || shopId },
        'MenuItem',
      ],
      transformResponse: (response) => {
        return response.data || { success: true };
      },
    }),

    // ===== MENU MODIFIERS =====

    // Get menu modifiers
    getMenuModifiers: builder.query({
      query: ({ restaurantId, zoneId, vendorId, shopId, isPublic = false }) => {
        let url;
        
        if (isPublic) {
          // Use public endpoints for unauthenticated access
          if (restaurantId) {
            url = `/menus/public/restaurant/${restaurantId}/modifiers`;
          } else if (vendorId) {
            url = `/menus/public/shop/${vendorId}/modifiers`;
          } else if (shopId) {
            url = `/menus/public/shop/${shopId}/modifiers`;
          } else if (zoneId) {
            url = `/menus/public/zone/${zoneId}/modifiers`;
          }
        } else {
          // Use authenticated endpoints
          if (restaurantId) {
            url = `/menus/restaurant/${restaurantId}/modifiers`;
          } else if (vendorId) {
            url = `/menus/shop/${vendorId}/modifiers`;
          } else if (shopId) {
            url = `/menus/shop/${shopId}/modifiers`;
          } else if (zoneId) {
            url = `/menus/zone/${zoneId}/modifiers`;
          }
        }
        
        return url;
      },
      providesTags: (result, error, { restaurantId, zoneId, vendorId, shopId }) => [
        { type: 'MenuModifier', id: restaurantId || zoneId || vendorId || shopId },
        'MenuModifier',
      ],
      transformResponse: (response) => {
        return response.data || response || [];
      },
    }),

    // Create menu modifier
    createMenuModifier: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, shopId, modifierData }) => {
        let url;
        
        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/modifiers`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/modifiers`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/modifiers`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/modifiers`;
        }
        
        return {
          url,
          method: 'POST',
          body: modifierData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId, shopId }) => [
        { type: 'MenuModifier', id: restaurantId || zoneId || vendorId || shopId },
        'MenuModifier',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update menu modifier
    updateMenuModifier: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, shopId, modifierId, modifierData }) => {
        let url;
        
        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/modifiers/${modifierId}`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/modifiers/${modifierId}`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/modifiers/${modifierId}`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/modifiers/${modifierId}`;
        }
        
        return {
          url,
          method: 'PUT',
          body: modifierData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId, shopId, modifierId }) => [
        { type: 'MenuModifier', id: modifierId },
        { type: 'MenuModifier', id: restaurantId || zoneId || vendorId || shopId },
        'MenuModifier',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Delete menu modifier
    deleteMenuModifier: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, shopId, modifierId }) => {
        let url;
        
        if (restaurantId) {
          url = `/menus/restaurant/${restaurantId}/modifiers/${modifierId}`;
        } else if (vendorId) {
          url = `/menus/shop/${vendorId}/modifiers/${modifierId}`;
        } else if (shopId) {
          url = `/menus/shop/${shopId}/modifiers/${modifierId}`;
        } else if (zoneId) {
          url = `/menus/zone/${zoneId}/modifiers/${modifierId}`;
        }
        
        return {
          url,
          method: 'DELETE',
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId, shopId }) => [
        { type: 'MenuModifier', id: restaurantId || zoneId || vendorId || shopId },
        'MenuModifier',
      ],
      transformResponse: (response) => {
        return response.data || { success: true };
      },
    }),

    // ===== BULK OPERATIONS =====

    // Bulk update menu items
    bulkUpdateMenuItems: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, updates }) => {
        let url;
        
        if (restaurantId) {
          url = `/restaurants/${restaurantId}/menus/items/bulk-update`;
        } else if (vendorId) {
          url = `/vendors/${vendorId}/menus/items/bulk-update`;
        } else if (zoneId) {
          url = `/zones/${zoneId}/menus/items/bulk-update`;
        }
        
        return {
          url,
          method: 'PUT',
          body: { updates },
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId }) => [
        { type: 'MenuItem', id: restaurantId || zoneId || vendorId },
        'MenuItem',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
  }),
});

export const {
  // Menu categories
  useGetMenuCategoriesQuery,
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,

  // Menu items
  useGetMenuItemsQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,

  // Menu modifiers
  useGetMenuModifiersQuery,
  useCreateMenuModifierMutation,
  useUpdateMenuModifierMutation,
  useDeleteMenuModifierMutation,

  // Bulk operations
  useBulkUpdateMenuItemsMutation,
} = menuApi;