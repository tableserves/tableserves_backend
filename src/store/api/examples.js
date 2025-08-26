/**
 * RTK Query Usage Examples and Migration Guide
 * 
 * This file demonstrates how to use the new RTK Query APIs and provides
 * migration guidance from the old manual async thunks to RTK Query hooks.
 */

// ===== IMPORT EXAMPLES =====

// Import specific hooks from the API slices
import {
  useLoginMutation,
  useGetRestaurantsQuery,
  useCreateRestaurantMutation,
  useGetVendorsQuery,
  useAddVendorMutation,
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetMenuItemsQuery,
  useCreateMenuItemMutation,
} from '../store/api';

// ===== COMPONENT USAGE EXAMPLES =====

// Example 1: Authentication with RTK Query
function LoginComponent() {
  const [login, { isLoading, error }] = useLoginMutation();
  
  const handleLogin = async (credentials) => {
    try {
      const result = await login(credentials).unwrap();
      console.log('Login successful:', result);
      // Redirect or update UI state
    } catch (err) {
      console.error('Login failed:', err);
    }
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      handleLogin({
        username: formData.get('username'),
        password: formData.get('password')
      });
    }}>
      <input name="username" type="text" placeholder="Username" />
      <input name="password" type="password" placeholder="Password" />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

// Example 2: Fetching and displaying data
function RestaurantsList() {
  const { 
    data: restaurants, 
    isLoading, 
    error,
    refetch 
  } = useGetRestaurantsQuery();
  
  if (isLoading) return <div>Loading restaurants...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {restaurants?.map(restaurant => (
        <div key={restaurant.id}>
          <h3>{restaurant.name}</h3>
          <p>{restaurant.description}</p>
        </div>
      ))}
    </div>
  );
}

// Example 3: Creating new data with optimistic updates
function CreateRestaurantForm() {
  const [createRestaurant, { isLoading }] = useCreateRestaurantMutation();
  
  const handleSubmit = async (formData) => {
    try {
      const newRestaurant = await createRestaurant(formData).unwrap();
      console.log('Restaurant created:', newRestaurant);
      // Form will automatically refresh due to cache invalidation
    } catch (err) {
      console.error('Failed to create restaurant:', err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Restaurant'}
      </button>
    </form>
  );
}

// Example 4: Real-time data with polling
function LiveOrdersDashboard({ role, entityId }) {
  const { 
    data: liveOrders, 
    isLoading 
  } = useGetLiveOrdersQuery(
    { role, entityId },
    { 
      pollingInterval: 30000, // Poll every 30 seconds
      refetchOnFocus: true,   // Refetch when window gets focus
    }
  );
  
  return (
    <div>
      <h2>Live Orders {isLoading && '(Updating...)'}</h2>
      {liveOrders?.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

// Example 5: Conditional queries
function RestaurantDetails({ restaurantId }) {
  // Only fetch if restaurantId exists
  const { 
    data: restaurant, 
    isLoading 
  } = useGetRestaurantQuery(restaurantId, {
    skip: !restaurantId, // Skip query if no ID
  });
  
  // Fetch menu items for this restaurant
  const { 
    data: menuItems 
  } = useGetMenuItemsQuery(
    { restaurantId },
    { skip: !restaurantId }
  );
  
  if (!restaurantId) return <div>Select a restaurant</div>;
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{restaurant?.name}</h1>
      <div>Menu Items: {menuItems?.length || 0}</div>
    </div>
  );
}

// ===== MIGRATION GUIDE =====

/**
 * BEFORE (Old Async Thunk Pattern):
 * 
 * const dispatch = useDispatch();
 * const { user, loading, error } = useSelector(state => state.auth);
 * 
 * const handleLogin = (credentials) => {
 *   dispatch(loginUser(credentials));
 * };
 * 
 * AFTER (RTK Query Pattern):
 * 
 * const [login, { isLoading, error }] = useLoginMutation();
 * 
 * const handleLogin = async (credentials) => {
 *   try {
 *     const result = await login(credentials).unwrap();
 *     // Handle success
 *   } catch (err) {
 *     // Handle error
 *   }
 * };
 */

/**
 * BENEFITS OF RTK QUERY:
 * 
 * 1. Automatic Caching: Data is cached and reused across components
 * 2. Background Refetching: Automatic updates when data becomes stale
 * 3. Optimistic Updates: UI updates immediately, reverts on error
 * 4. Loading States: Built-in loading and error states
 * 5. Polling: Automatic polling for real-time data
 * 6. Cache Invalidation: Smart cache updates on mutations
 * 7. Request Deduplication: Multiple identical requests are merged
 * 8. Offline Support: Works with Redux Persist for offline capability
 */

/**
 * ADVANCED USAGE PATTERNS:
 */

// Pattern 1: Prefetching data
function usePrefetchRestaurantData(restaurantId) {
  const dispatch = useDispatch();
  
  useEffect(() => {
    if (restaurantId) {
      // Prefetch related data
      dispatch(api.endpoints.getRestaurant.initiate(restaurantId));
      dispatch(api.endpoints.getMenuItems.initiate({ restaurantId }));
      dispatch(api.endpoints.getMenuCategories.initiate({ restaurantId }));
    }
  }, [restaurantId, dispatch]);
}

// Pattern 2: Manual cache updates
function useOptimisticOrderUpdate() {
  const [updateStatus] = useUpdateOrderStatusMutation();
  
  const updateOrderStatusOptimistically = (orderId, newStatus) => {
    // Optimistic update
    dispatch(
      api.util.updateQueryData('getOrders', undefined, (draft) => {
        const order = draft.find(o => o.id === orderId);
        if (order) {
          order.status = newStatus;
          order.updatedAt = new Date().toISOString();
        }
      })
    );
    
    // Actual update
    updateStatus({ orderId, status: newStatus });
  };
  
  return updateOrderStatusOptimistically;
}

// Pattern 3: Selective cache invalidation
function useDataRefresh() {
  const dispatch = useDispatch();
  
  const refreshRestaurantData = (restaurantId) => {
    dispatch(api.util.invalidateTags([
      { type: 'Restaurant', id: restaurantId },
      { type: 'MenuItem', id: restaurantId },
      { type: 'MenuCategory', id: restaurantId },
    ]));
  };
  
  const refreshAllData = () => {
    dispatch(api.util.invalidateTags([
      'Restaurant', 'Zone', 'Vendor', 'Order', 'MenuItem'
    ]));
  };
  
  return { refreshRestaurantData, refreshAllData };
}

export {
  LoginComponent,
  RestaurantsList,
  CreateRestaurantForm,
  LiveOrdersDashboard,
  RestaurantDetails,
  usePrefetchRestaurantData,
  useOptimisticOrderUpdate,
  useDataRefresh,
};