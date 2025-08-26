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
      query: ({ restaurantId, zoneId }) => {
        const endpoint = restaurantId 
          ? `/restaurants/${restaurantId}/menu/categories`
          : `/zones/${zoneId}/menu/categories`;
        
        return {
          endpoint,
          method: 'GET',
        };
      },
      providesTags: (result, error, { restaurantId, zoneId }) => [
        { type: 'MenuCategory', id: restaurantId || zoneId },
        'MenuCategory',
      ],
      transformResponse: (response) => {
        return response.data || [];
      },
    }),

    // Create menu category
    createMenuCategory: builder.mutation({
      query: ({ restaurantId, zoneId, categoryData }) => {
        const endpoint = restaurantId 
          ? `/restaurants/${restaurantId}/menu/categories`
          : `/zones/${zoneId}/menu/categories`;
        
        return {
          endpoint,
          method: 'POST',
          data: categoryData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId }) => [
        { type: 'MenuCategory', id: restaurantId || zoneId },
        'MenuCategory',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update menu category
    updateMenuCategory: builder.mutation({
      query: ({ restaurantId, zoneId, categoryId, categoryData }) => {
        const endpoint = restaurantId 
          ? `/restaurants/${restaurantId}/menu/categories/${categoryId}`
          : `/zones/${zoneId}/menu/categories/${categoryId}`;
        
        return {
          endpoint,
          method: 'PUT',
          data: categoryData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, categoryId }) => [
        { type: 'MenuCategory', id: categoryId },
        { type: 'MenuCategory', id: restaurantId || zoneId },
        'MenuCategory',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Delete menu category
    deleteMenuCategory: builder.mutation({
      query: ({ restaurantId, zoneId, categoryId }) => {
        const endpoint = restaurantId 
          ? `/restaurants/${restaurantId}/menu/categories/${categoryId}`
          : `/zones/${zoneId}/menu/categories/${categoryId}`;
        
        return {
          endpoint,
          method: 'DELETE',
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId }) => [
        { type: 'MenuCategory', id: restaurantId || zoneId },
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
      query: ({ restaurantId, zoneId, vendorId, categoryId }) => {
        let endpoint;
        
        if (restaurantId) {
          endpoint = `/restaurants/${restaurantId}/menu/items`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/menu/items`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/menu/items`;
        }
        
        if (categoryId) {
          endpoint += `?categoryId=${categoryId}`;
        }
        
        return {
          endpoint,
          method: 'GET',
        };
      },
      providesTags: (result, error, { restaurantId, zoneId, vendorId }) => [
        { type: 'MenuItem', id: restaurantId || zoneId || vendorId },
        'MenuItem',
      ],
      transformResponse: (response) => {
        return response.data || [];
      },
    }),

    // Create menu item
    createMenuItem: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, categoryId, itemData }) => {
        let endpoint;
        
        if (restaurantId && categoryId) {
          endpoint = `/restaurants/${restaurantId}/categories/${categoryId}/items`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/menu/items`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/menu/items`;
        }
        
        return {
          endpoint,
          method: 'POST',
          data: itemData,
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
      query: ({ restaurantId, zoneId, vendorId, itemId, itemData }) => {
        let endpoint;
        
        if (restaurantId) {
          endpoint = `/restaurants/${restaurantId}/items/${itemId}`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/items/${itemId}`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/items/${itemId}`;
        }
        
        return {
          endpoint,
          method: 'PUT',
          data: itemData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId, itemId }) => [
        { type: 'MenuItem', id: itemId },
        { type: 'MenuItem', id: restaurantId || zoneId || vendorId },
        'MenuItem',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Delete menu item
    deleteMenuItem: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, itemId }) => {
        let endpoint;
        
        if (restaurantId) {
          endpoint = `/restaurants/${restaurantId}/items/${itemId}`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/items/${itemId}`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/items/${itemId}`;
        }
        
        return {
          endpoint,
          method: 'DELETE',
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId }) => [
        { type: 'MenuItem', id: restaurantId || zoneId || vendorId },
        'MenuItem',
      ],
      transformResponse: (response) => {
        return response.data || { success: true };
      },
    }),

    // ===== MENU MODIFIERS =====

    // Get menu modifiers
    getMenuModifiers: builder.query({
      query: ({ restaurantId, zoneId, vendorId }) => {
        let endpoint;
        
        if (restaurantId) {
          endpoint = `/restaurants/${restaurantId}/menu/modifiers`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/menu/modifiers`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/menu/modifiers`;
        }
        
        return {
          endpoint,
          method: 'GET',
        };
      },
      providesTags: (result, error, { restaurantId, zoneId, vendorId }) => [
        { type: 'MenuModifier', id: restaurantId || zoneId || vendorId },
        'MenuModifier',
      ],
      transformResponse: (response) => {
        return response.data || [];
      },
    }),

    // Create menu modifier
    createMenuModifier: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, modifierData }) => {
        let endpoint;
        
        if (restaurantId) {
          endpoint = `/restaurants/${restaurantId}/menu/modifiers`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/menu/modifiers`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/menu/modifiers`;
        }
        
        return {
          endpoint,
          method: 'POST',
          data: modifierData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId }) => [
        { type: 'MenuModifier', id: restaurantId || zoneId || vendorId },
        'MenuModifier',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Update menu modifier
    updateMenuModifier: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, modifierId, modifierData }) => {
        let endpoint;
        
        if (restaurantId) {
          endpoint = `/restaurants/${restaurantId}/menu/modifiers/${modifierId}`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/menu/modifiers/${modifierId}`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/menu/modifiers/${modifierId}`;
        }
        
        return {
          endpoint,
          method: 'PUT',
          data: modifierData,
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId, modifierId }) => [
        { type: 'MenuModifier', id: modifierId },
        { type: 'MenuModifier', id: restaurantId || zoneId || vendorId },
        'MenuModifier',
      ],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // Delete menu modifier
    deleteMenuModifier: builder.mutation({
      query: ({ restaurantId, zoneId, vendorId, modifierId }) => {
        let endpoint;
        
        if (restaurantId) {
          endpoint = `/restaurants/${restaurantId}/menu/modifiers/${modifierId}`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/menu/modifiers/${modifierId}`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/menu/modifiers/${modifierId}`;
        }
        
        return {
          endpoint,
          method: 'DELETE',
        };
      },
      invalidatesTags: (result, error, { restaurantId, zoneId, vendorId }) => [
        { type: 'MenuModifier', id: restaurantId || zoneId || vendorId },
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
        let endpoint;
        
        if (restaurantId) {
          endpoint = `/restaurants/${restaurantId}/menu/items/bulk-update`;
        } else if (vendorId) {
          endpoint = `/vendors/${vendorId}/menu/items/bulk-update`;
        } else if (zoneId) {
          endpoint = `/zones/${zoneId}/menu/items/bulk-update`;
        }
        
        return {
          endpoint,
          method: 'PUT',
          data: { updates },
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