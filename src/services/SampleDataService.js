import LocalStorageService from './LocalStorageService';

class SampleDataService {
  // Initialize sample data for testing reports
  static initializeSampleData() {
    this.createSampleRestaurants();
    this.createSampleZones();
    this.createSampleMenuItems();
    this.createSampleOrders();
  }

  static createSampleRestaurants() {
    const restaurants = LocalStorageService.getRestaurants();

    // Only add sample data if no restaurants exist
    if (restaurants.length === 0) {
      const sampleRestaurants = [
        {
          id: '1',
          name: 'Bella Vista Restaurant',
          slug: 'bella-vista',
          description: 'Fine dining Italian restaurant with authentic cuisine',
          logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
          ownerName: 'Marco Rossi',
          ownerEmail: 'marco@bellavista.com',
          ownerPhone: '+1-555-0101',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          cuisine: 'Italian',
          subscriptionPlan: 'Premium',
          status: 'active',
          tables: 25,
          revenue: 45000,
          orders: 1250,
          todayOrders: 35,
          todayRevenue: 1200,
          rating: 4.8,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Spice Garden',
          slug: 'spice-garden',
          description: 'Authentic Indian cuisine with traditional spices',
          logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200',
          ownerName: 'Raj Patel',
          ownerEmail: 'raj@spicegarden.com',
          ownerPhone: '+1-555-0102',
          address: '456 Oak Avenue',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          cuisine: 'Indian',
          subscriptionPlan: 'Basic',
          status: 'active',
          tables: 18,
          revenue: 32000,
          orders: 890,
          todayOrders: 28,
          todayRevenue: 950,
          rating: 4.6,
          createdAt: '2024-01-05T00:00:00Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Ocean Breeze Seafood',
          slug: 'ocean-breeze',
          description: 'Fresh seafood restaurant with ocean views',
          logo: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=200',
          ownerName: 'Sarah Johnson',
          ownerEmail: 'sarah@oceanbreeze.com',
          ownerPhone: '+1-555-0103',
          address: '789 Coastal Drive',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          cuisine: 'Seafood',
          subscriptionPlan: 'Premium',
          status: 'active',
          tables: 30,
          revenue: 58000,
          orders: 1450,
          todayOrders: 42,
          todayRevenue: 1580,
          rating: 4.9,
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Mountain View Cafe',
          slug: 'mountain-view-cafe',
          description: 'Cozy cafe with mountain views and artisan coffee',
          logo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200',
          ownerName: 'David Chen',
          ownerEmail: 'david@mountainview.com',
          ownerPhone: '+1-555-0104',
          address: '321 Highland Road',
          city: 'Denver',
          state: 'CO',
          zipCode: '80202',
          cuisine: 'American',
          subscriptionPlan: 'Starter',
          status: 'suspended',
          tables: 12,
          revenue: 18000,
          orders: 520,
          todayOrders: 0,
          todayRevenue: 0,
          rating: 4.3,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: new Date().toISOString()
        }
      ];

      sampleRestaurants.forEach(restaurant => {
        LocalStorageService.addRestaurant(restaurant);
      });
    }
  }

  static createSampleZones() {
    const zones = LocalStorageService.getZones();

    // Only add sample data if no zones exist
    if (zones.length === 0) {
      const sampleZones = [
        {
          id: '1',
          name: 'Downtown Food Street',
          description: 'Premier food court in downtown business district',
          ownerName: 'Michael Torres',
          ownerEmail: 'michael@downtownfood.com',
          ownerPhone: '+1-555-0201',
          address: '100 Business Plaza',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          subscriptionPlan: 'advanced',
          status: 'active',
          totalRevenue: 125000,
          commissionEarned: 12500,
          totalOrders: 2800,
          todayOrders: 85,
          todayRevenue: 3200,
          vendors: 8,
          vendorCount: 8,
          currentVendors: 8,
          tables: 25,
          tableCount: 25,
          monthlyRevenue: 45000,
          revenue: '₹125,000',
          orders: 2800,
          shops: [
            { id: 'shop1', name: 'Pizza Corner', type: 'restaurant' },
            { id: 'shop2', name: 'Burger Hub', type: 'restaurant' },
            { id: 'shop3', name: 'Sushi Express', type: 'restaurant' }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Riverside Food Court',
          description: 'Family-friendly food court by the riverside',
          ownerName: 'Lisa Wang',
          ownerEmail: 'lisa@riverside.com',
          ownerPhone: '+1-555-0202',
          address: '200 River Walk',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
          subscriptionPlan: 'basic',
          status: 'active',
          totalRevenue: 89000,
          commissionEarned: 8900,
          totalOrders: 1950,
          todayOrders: 62,
          todayRevenue: 2100,
          vendors: 5,
          vendorCount: 5,
          currentVendors: 5,
          tables: 12,
          tableCount: 12,
          monthlyRevenue: 28000,
          revenue: '₹89,000',
          orders: 1950,
          shops: [
            { id: 'shop4', name: 'Taco Fiesta', type: 'restaurant' },
            { id: 'shop5', name: 'Smoothie Bar', type: 'vendor' }
          ],
          createdAt: '2024-01-08T00:00:00Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Campus Food Hub',
          description: 'Student-friendly food zone near university campus',
          ownerName: 'Alex Johnson',
          ownerEmail: 'alex@campusfood.com',
          ownerPhone: '+1-555-0203',
          address: '300 University Ave',
          city: 'College Town',
          state: 'CA',
          zipCode: '94101',
          subscriptionPlan: 'free',
          status: 'active',
          totalRevenue: 12000,
          commissionEarned: 1200,
          totalOrders: 450,
          todayOrders: 15,
          todayRevenue: 320,
          vendors: 1,
          vendorCount: 1,
          currentVendors: 1,
          tables: 1,
          tableCount: 1,
          monthlyRevenue: 3200,
          revenue: '₹12,000',
          orders: 450,
          shops: [
            { id: 'shop6', name: 'Student Bites', type: 'restaurant' }
          ],
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Mall Food Plaza',
          description: 'Shopping mall food court with diverse options',
          ownerName: 'Sarah Chen',
          ownerEmail: 'sarah@mallfoodplaza.com',
          ownerPhone: '+1-555-0204',
          address: '400 Shopping Center Dr',
          city: 'Metro City',
          state: 'TX',
          zipCode: '75201',
          subscriptionPlan: 'basic',
          status: 'pending',
          totalRevenue: 65000,
          commissionEarned: 6500,
          totalOrders: 1200,
          todayOrders: 35,
          todayRevenue: 1100,
          vendors: 4,
          vendorCount: 4,
          currentVendors: 4,
          tables: 8,
          tableCount: 8,
          monthlyRevenue: 18000,
          revenue: '₹65,000',
          orders: 1200,
          shops: [
            { id: 'shop7', name: 'Asian Delight', type: 'restaurant' },
            { id: 'shop8', name: 'Sandwich Corner', type: 'vendor' }
          ],
          createdAt: '2024-01-20T00:00:00Z',
          updatedAt: new Date().toISOString()
        }
      ];

      sampleZones.forEach(zone => {
        LocalStorageService.addZone(zone);
        
        // Create sample shops/vendors for each zone
        const sampleShops = [];
        
        if (zone.id === '1') {
          // Downtown Food Street - Advanced plan
          sampleShops.push(
            {
              id: 'shop1',
              name: 'Pizza Corner',
              description: 'Authentic Italian pizzas made with fresh ingredients',
              cuisine: 'Italian',
              logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200',
              status: 'active',
              rating: 4.5,
              reviews: '120+',
              prepTime: '15-20',
              zoneId: zone.id
            },
            {
              id: 'shop2',
              name: 'Burger Hub',
              description: 'Gourmet burgers and American classics',
              cuisine: 'American',
              logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200',
              status: 'active',
              rating: 4.3,
              reviews: '95+',
              prepTime: '10-15',
              zoneId: zone.id
            },
            {
              id: 'shop3',
              name: 'Sushi Express',
              description: 'Fresh sushi and Japanese delicacies',
              cuisine: 'Japanese',
              logo: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200',
              status: 'active',
              rating: 4.7,
              reviews: '80+',
              prepTime: '20-25',
              zoneId: zone.id
            }
          );
        } else if (zone.id === '2') {
          // Riverside Food Court - Basic plan
          sampleShops.push(
            {
              id: 'shop4',
              name: 'Taco Fiesta',
              description: 'Authentic Mexican tacos and burritos',
              cuisine: 'Mexican',
              logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200',
              status: 'active',
              rating: 4.4,
              reviews: '60+',
              prepTime: '12-18',
              zoneId: zone.id
            },
            {
              id: 'shop5',
              name: 'Smoothie Bar',
              description: 'Fresh smoothies and healthy drinks',
              cuisine: 'Beverages',
              logo: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=200',
              status: 'active',
              rating: 4.2,
              reviews: '45+',
              prepTime: '5-10',
              zoneId: zone.id
            }
          );
        } else if (zone.id === '3') {
          // Campus Food Hub - Free plan
          sampleShops.push(
            {
              id: 'shop6',
              name: 'Student Bites',
              description: 'Quick and affordable meals for students',
              cuisine: 'Various',
              logo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200',
              status: 'active',
              rating: 4.0,
              reviews: '30+',
              prepTime: '8-12',
              zoneId: zone.id
            }
          );
        } else if (zone.id === '4') {
          // Mall Food Plaza - Basic plan
          sampleShops.push(
            {
              id: 'shop7',
              name: 'Asian Delight',
              description: 'Delicious Asian fusion cuisine',
              cuisine: 'Asian',
              logo: 'https://images.unsplash.com/photo-1512003867696-6d4ce36945c6?w=200',
              status: 'active',
              rating: 4.6,
              reviews: '70+',
              prepTime: '15-20',
              zoneId: zone.id
            },
            {
              id: 'shop8',
              name: 'Sandwich Corner',
              description: 'Fresh sandwiches and quick bites',
              cuisine: 'American',
              logo: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200',
              status: 'active',
              rating: 4.1,
              reviews: '50+',
              prepTime: '5-8',
              zoneId: zone.id
            }
          );
        }
        
        // Save shops for this zone
        if (sampleShops.length > 0) {
          localStorage.setItem(`tableserve_zone_shops_${zone.id}`, JSON.stringify(sampleShops));
          console.log(`Created ${sampleShops.length} sample shops for zone ${zone.id}`);
        }
      });
    }
  }

  static createSampleOrders() {
    // Create sample orders for restaurants
    const restaurants = LocalStorageService.getRestaurants();

    restaurants.forEach(restaurant => {
      const existingOrders = JSON.parse(localStorage.getItem(`restaurant_orders_${restaurant.id}`) || '[]');

      if (existingOrders.length === 0) {
        const sampleOrders = this.generateSampleOrders(restaurant.id, 'restaurant', 50);
        localStorage.setItem(`restaurant_orders_${restaurant.id}`, JSON.stringify(sampleOrders));
      }
    });

    // Create sample orders for zones
    const zones = LocalStorageService.getZones();

    zones.forEach(zone => {
      const existingOrders = JSON.parse(localStorage.getItem(`zone_orders_${zone.id}`) || '[]');

      if (existingOrders.length === 0) {
        const sampleOrders = this.generateSampleOrders(zone.id, 'zone', 75);
        localStorage.setItem(`zone_orders_${zone.id}`, JSON.stringify(sampleOrders));
      }
    });
  }

  static generateSampleOrders(entityId, entityType, count) {
    const orders = [];
    const statuses = ['delivered', 'preparing', 'pending', 'cancelled'];
    const customers = [
      { name: 'John Doe', phone: '+1-555-1001', email: 'john@email.com' },
      { name: 'Jane Smith', phone: '+1-555-1002', email: 'jane@email.com' },
      { name: 'Mike Johnson', phone: '+1-555-1003', email: 'mike@email.com' },
      { name: 'Sarah Wilson', phone: '+1-555-1004', email: 'sarah@email.com' },
      { name: 'David Brown', phone: '+1-555-1005', email: 'david@email.com' }
    ];

    const menuItems = [
      { name: 'Margherita Pizza', price: 18.99 },
      { name: 'Caesar Salad', price: 12.99 },
      { name: 'Grilled Chicken', price: 22.50 },
      { name: 'Pasta Carbonara', price: 16.99 },
      { name: 'Fish Tacos', price: 14.99 },
      { name: 'Beef Burger', price: 15.99 },
      { name: 'Vegetable Stir Fry', price: 13.99 },
      { name: 'Chocolate Cake', price: 8.99 },
      { name: 'Coffee', price: 4.99 },
      { name: 'Fresh Juice', price: 6.99 }
    ];

    for (let i = 0; i < count; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
      orderDate.setHours(Math.floor(Math.random() * 24));
      orderDate.setMinutes(Math.floor(Math.random() * 60));

      const orderItems = [];
      const itemCount = Math.floor(Math.random() * 4) + 1; // 1-4 items

      for (let j = 0; j < itemCount; j++) {
        const item = menuItems[Math.floor(Math.random() * menuItems.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        orderItems.push({
          name: item.name,
          price: item.price,
          quantity: quantity
        });
      }

      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + tax;

      orders.push({
        id: `ORD-${entityType.toUpperCase()}-${entityId}-${Date.now()}-${i}`,
        orderId: `ORD-${Date.now()}-${i}`,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        items: orderItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        grandTotal: parseFloat(total.toFixed(2)),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        orderTime: orderDate.toISOString(),
        timestamp: orderDate.toISOString(),
        createdAt: orderDate.toISOString(),
        tableNumber: `T-${Math.floor(Math.random() * 20) + 1}`,
        paymentMethod: Math.random() > 0.5 ? 'Credit Card' : 'Cash',
        specialInstructions: Math.random() > 0.7 ? 'Extra spicy' : '',
        type: entityType
      });
    }

    return orders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
  }

  static createSampleMenuItems() {
    // Add sample menu items for restaurants
    const restaurants = LocalStorageService.getRestaurants();

    const sampleMenuCategories = [
      { id: 'cat1', name: 'Appetizers', description: 'Start your meal with these delicious appetizers', active: true, sortOrder: 1 },
      { id: 'cat2', name: 'Main Course', description: 'Hearty main dishes to satisfy your hunger', active: true, sortOrder: 2 },
      { id: 'cat3', name: 'Desserts', description: 'Sweet treats to end your meal perfectly', active: true, sortOrder: 3 },
      { id: 'cat4', name: 'Beverages', description: 'Refreshing drinks and hot beverages', active: true, sortOrder: 4 },
      { id: 'cat5', name: 'Seafood', description: 'Fresh catches from the ocean', active: true, sortOrder: 5 }
    ];

    restaurants.forEach(restaurant => {
      const existingMenuItems = localStorage.getItem(`restaurant_menu_items_${restaurant.id}`);

      if (!existingMenuItems || existingMenuItems === '[]') {
        let sampleMenuItems = [];

        if (restaurant.cuisine === 'Italian') {
          sampleMenuItems = [
            { id: 1, name: 'Bruschetta', description: 'Toasted bread with tomatoes and basil', price: 8.99, categoryId: 'cat1', category: 'Appetizers', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=300', restaurantId: restaurant.id },
            { id: 2, name: 'Spaghetti Carbonara', description: 'Classic pasta with eggs, cheese, and pancetta', price: 16.99, categoryId: 'cat2', category: 'Main Course', isVeg: false, available: true, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300', restaurantId: restaurant.id },
            { id: 3, name: 'Margherita Pizza', description: 'Traditional pizza with tomato, mozzarella, and basil', price: 14.99, categoryId: 'cat2', category: 'Main Course', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300', restaurantId: restaurant.id },
            { id: 4, name: 'Tiramisu', description: 'Classic Italian dessert with coffee and mascarpone', price: 7.99, categoryId: 'cat3', category: 'Desserts', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300', restaurantId: restaurant.id },
            { id: 5, name: 'Italian Wine', description: 'Selection of fine Italian red and white wines', price: 12.99, categoryId: 'cat4', category: 'Beverages', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1506377247333-1b978f2da400?w=300', restaurantId: restaurant.id }
          ];
        } else if (restaurant.cuisine === 'Indian') {
          sampleMenuItems = [
            { id: 6, name: 'Samosas', description: 'Crispy triangular pastries filled with spiced potatoes', price: 6.99, categoryId: 'cat1', category: 'Appetizers', isVeg: true, isSpicy: true, available: true, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300', restaurantId: restaurant.id },
            { id: 7, name: 'Chicken Tikka Masala', description: 'Tender chicken in creamy tomato-based curry', price: 18.99, categoryId: 'cat2', category: 'Main Course', isVeg: false, isSpicy: true, available: true, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300', restaurantId: restaurant.id },
            { id: 8, name: 'Paneer Butter Masala', description: 'Cottage cheese in rich, creamy tomato gravy', price: 15.99, categoryId: 'cat2', category: 'Main Course', isVeg: true, isSpicy: true, available: true, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300', restaurantId: restaurant.id },
            { id: 9, name: 'Gulab Jamun', description: 'Sweet milk dumplings in sugar syrup', price: 5.99, categoryId: 'cat3', category: 'Desserts', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1571167530149-c72f18364ba2?w=300', restaurantId: restaurant.id },
            { id: 10, name: 'Masala Chai', description: 'Traditional spiced tea with milk and sugar', price: 3.99, categoryId: 'cat4', category: 'Beverages', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1597318821505-7c9b5cb3a6d4?w=300', restaurantId: restaurant.id }
          ];
        } else if (restaurant.cuisine === 'Seafood') {
          sampleMenuItems = [
            { id: 11, name: 'Shrimp Cocktail', description: 'Chilled shrimp with cocktail sauce', price: 12.99, categoryId: 'cat1', category: 'Appetizers', isVeg: false, available: true, image: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=300', restaurantId: restaurant.id },
            { id: 12, name: 'Grilled Salmon', description: 'Fresh Atlantic salmon with lemon butter sauce', price: 26.99, categoryId: 'cat5', category: 'Seafood', isVeg: false, available: true, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300', restaurantId: restaurant.id },
            { id: 13, name: 'Lobster Thermidor', description: 'Lobster tail with creamy cheese sauce', price: 34.99, categoryId: 'cat5', category: 'Seafood', isVeg: false, available: true, image: 'https://images.unsplash.com/photo-1519858530242-6ca8f0b06b31?w=300', restaurantId: restaurant.id },
            { id: 14, name: 'Key Lime Pie', description: 'Tangy Florida key lime pie with graham crust', price: 6.99, categoryId: 'cat3', category: 'Desserts', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300', restaurantId: restaurant.id },
            { id: 15, name: 'House White Wine', description: 'Crisp Sauvignon Blanc perfect with seafood', price: 9.99, categoryId: 'cat4', category: 'Beverages', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1557449143-085ac5c52bc2?w=300', restaurantId: restaurant.id }
          ];
        } else {
          // Default American cuisine for other restaurants
          sampleMenuItems = [
            { id: 16, name: 'Buffalo Wings', description: 'Spicy chicken wings with celery and ranch', price: 10.99, categoryId: 'cat1', category: 'Appetizers', isVeg: false, isSpicy: true, available: true, image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=300', restaurantId: restaurant.id },
            { id: 17, name: 'Classic Burger', description: 'Beef patty with lettuce, tomato, and special sauce', price: 13.99, categoryId: 'cat2', category: 'Main Course', isVeg: false, available: true, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300', restaurantId: restaurant.id },
            { id: 18, name: 'Grilled Cheese', description: 'Melted cheese on toasted sourdough bread', price: 8.99, categoryId: 'cat2', category: 'Main Course', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300', restaurantId: restaurant.id },
            { id: 19, name: 'Apple Pie', description: 'Homemade apple pie with vanilla ice cream', price: 6.99, categoryId: 'cat3', category: 'Desserts', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=300', restaurantId: restaurant.id },
            { id: 20, name: 'Craft Beer', description: 'Local brewery selection of IPAs and lagers', price: 5.99, categoryId: 'cat4', category: 'Beverages', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300', restaurantId: restaurant.id }
          ];
        }

        localStorage.setItem(`restaurant_menu_items_${restaurant.id}`, JSON.stringify(sampleMenuItems));

        // Also update the restaurant object with menu items
        restaurant.menuItems = sampleMenuItems;
        restaurant.menuCategories = sampleMenuCategories;
      }
    });

    // Save updated restaurants
    if (restaurants.length > 0) {
      LocalStorageService.saveRestaurants(restaurants);
    }

    // Add sample menu items for zone shops
    const zones = LocalStorageService.getZones();
    zones.forEach(zone => {
      const shops = LocalStorageService.getZoneShops(zone.id);
      shops.forEach(shop => {
        const existingMenuItems = localStorage.getItem(`vendor_menu_items_${shop.id}`);

        if (!existingMenuItems || existingMenuItems === '[]') {
          let sampleMenuItems = [];

          if (shop.name?.includes('Pizza')) {
            sampleMenuItems = [
              { id: 21, name: 'Pepperoni Pizza', description: 'Classic pizza with pepperoni and cheese', price: 12.99, category: 'Pizza', isVeg: false, available: true, shopId: shop.id },
              { id: 22, name: 'Veggie Supreme', description: 'Loaded with fresh vegetables and cheese', price: 11.99, category: 'Pizza', isVeg: true, available: true, shopId: shop.id },
              { id: 23, name: 'Garlic Bread', description: 'Warm bread with garlic butter and herbs', price: 4.99, category: 'Sides', isVeg: true, available: true, shopId: shop.id }
            ];
          } else if (shop.name?.includes('Burger')) {
            sampleMenuItems = [
              { id: 24, name: 'Double Cheeseburger', description: 'Two beef patties with double cheese', price: 15.99, category: 'Burgers', isVeg: false, available: true, shopId: shop.id },
              { id: 25, name: 'Veggie Burger', description: 'Plant-based patty with fresh toppings', price: 12.99, category: 'Burgers', isVeg: true, available: true, shopId: shop.id },
              { id: 26, name: 'French Fries', description: 'Crispy golden fries with seasoning', price: 5.99, category: 'Sides', isVeg: true, available: true, shopId: shop.id }
            ];
          } else if (shop.name?.includes('Sushi')) {
            sampleMenuItems = [
              { id: 27, name: 'California Roll', description: 'Crab, avocado, and cucumber roll', price: 8.99, category: 'Rolls', isVeg: false, available: true, shopId: shop.id },
              { id: 28, name: 'Salmon Nigiri', description: 'Fresh salmon over seasoned rice', price: 6.99, category: 'Nigiri', isVeg: false, available: true, shopId: shop.id },
              { id: 29, name: 'Vegetable Roll', description: 'Assorted fresh vegetables rolled in rice', price: 7.99, category: 'Rolls', isVeg: true, available: true, shopId: shop.id }
            ];
          } else {
            // Default items for other shops
            sampleMenuItems = [
              { id: 30 + parseInt(shop.id || '0'), name: 'Specialty Dish', description: 'House special prepared fresh daily', price: 14.99, category: 'Specials', isVeg: false, available: true, shopId: shop.id },
              { id: 31 + parseInt(shop.id || '0'), name: 'Fresh Salad', description: 'Mixed greens with seasonal vegetables', price: 9.99, category: 'Salads', isVeg: true, available: true, shopId: shop.id }
            ];
          }

          localStorage.setItem(`vendor_menu_items_${shop.id}`, JSON.stringify(sampleMenuItems));
        }
      });

      // Create default zone categories
      const sampleZoneCategories = [
        { id: 'all', name: 'All', description: 'View all menu items', active: true },
        { id: 'pizza', name: 'Pizza', description: 'Delicious pizzas and Italian favorites', active: true },
        { id: 'burgers', name: 'Burgers', description: 'Juicy burgers and American classics', active: true },
        { id: 'rolls', name: 'Rolls', description: 'Fresh sushi and Japanese cuisine', active: true },
        { id: 'sides', name: 'Sides', description: 'Appetizers and side dishes', active: true },
        { id: 'specials', name: 'Specials', description: 'House specialties and unique dishes', active: true },
        { id: 'salads', name: 'Salads', description: 'Fresh salads and healthy options', active: true }
      ];

      const existingZoneCategories = localStorage.getItem(`zone_menu_categories_${zone.id}`);
      if (!existingZoneCategories) {
        LocalStorageService.saveZoneCategories(zone.id, sampleZoneCategories);
      }
    });
  }

  // Check if sample data exists
  static hasSampleData() {
    const restaurants = LocalStorageService.getRestaurants();
    const zones = LocalStorageService.getZones();
    return restaurants.length > 0 || zones.length > 0;
  }

  // Clear all sample data
  static clearSampleData() {
    localStorage.removeItem(LocalStorageService.KEYS.RESTAURANTS);
    localStorage.removeItem(LocalStorageService.KEYS.ZONES);

    // Clear order data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('restaurant_orders_') || key.startsWith('zone_orders_'))) {
        localStorage.removeItem(key);
      }
    }
  }
}

export default SampleDataService;
