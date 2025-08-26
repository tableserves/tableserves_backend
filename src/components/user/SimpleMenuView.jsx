import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaStar, FaShoppingCart } from 'react-icons/fa';

const SimpleMenuView = () => {
  const { restaurantName, tableId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  // Mock restaurant data based on restaurantName
  const restaurant = {
    name: restaurantName ? restaurantName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Demo Restaurant",
    description: "Authentic cuisine with a modern twist",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"
  };

  // Mock menu data
  const menuItems = [
    {
      id: 1,
      name: "Margherita Pizza",
      description: "Fresh tomatoes, mozzarella, basil, olive oil",
      price: 18.99,
      category: "pizza",
      image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400",
      rating: 4.8,
      popular: true
    },
    {
      id: 2,
      name: "Spaghetti Carbonara",
      description: "Creamy pasta with pancetta, eggs, and parmesan",
      price: 16.99,
      category: "pasta",
      image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400",
      rating: 4.7
    },
    {
      id: 3,
      name: "Caesar Salad",
      description: "Crisp romaine, croutons, parmesan, caesar dressing",
      price: 12.99,
      category: "salads",
      image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400",
      rating: 4.5
    },
    {
      id: 4,
      name: "Tiramisu",
      description: "Classic Italian dessert with coffee and mascarpone",
      price: 8.99,
      category: "desserts",
      image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
      rating: 4.9
    },
    {
      id: 5,
      name: "Pepperoni Pizza",
      description: "Classic pepperoni with mozzarella and tomato sauce",
      price: 20.99,
      category: "pizza",
      image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400",
      rating: 4.6,
      popular: true
    },
    {
      id: 6,
      name: "Lasagna",
      description: "Layers of pasta, meat sauce, and cheese",
      price: 19.99,
      category: "pasta",
      image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400",
      rating: 4.8
    }
  ];

  const categories = [
    { id: 'all', name: 'All Items' },
    { id: 'pizza', name: 'Pizza' },
    { id: 'pasta', name: 'Pasta' },
    { id: 'salads', name: 'Salads' },
    { id: 'desserts', name: 'Desserts' }
  ];

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Add to cart function
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Calculate cart total
  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setCartTotal(total);
  }, [cart]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-fredoka text-white">{restaurant.name}</h1>
              <p className="text-white/70 font-raleway">Table {tableId}</p>
            </div>
            <div className="relative">
              <button className="bg-accent text-white p-3 rounded-full flex items-center space-x-2">
                <FaShoppingCart />
                <span className="font-raleway">{cart.length}</span>
              </button>
              {cart.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
              )}
            </div>
          </div>

          <p className="text-white/80 font-raleway mb-4">{restaurant.description}</p>

          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Categories */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full font-raleway whitespace-nowrap transition-colors ${selectedCategory === category.id
                ? 'bg-accent text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden"
            >
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                {item.popular && (
                  <div className="absolute top-3 left-3 bg-accent text-white px-2 py-1 rounded-full text-xs font-raleway">
                    Popular
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-fredoka text-white">{item.name}</h3>
                  <div className="flex items-center space-x-1">
                    <FaStar className="text-yellow-400 text-sm" />
                    <span className="text-white/70 text-sm font-raleway">{item.rating}</span>
                  </div>
                </div>

                <p className="text-white/70 font-raleway text-sm mb-4">{item.description}</p>

                <div className="flex justify-between items-center">
                  <span className="text-xl font-fredoka text-accent">${item.price}</span>
                  <motion.button
                    onClick={() => addToCart(item)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-accent hover:bg-accent/90 text-white p-2 rounded-full transition-colors"
                  >
                    <FaPlus />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-6 right-6 bg-accent rounded-2xl p-4 shadow-xl"
          >
            <div className="flex justify-between items-center text-white">
              <div>
                <p className="font-raleway">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items in cart
                </p>
                <p className="text-xl font-fredoka">Total: ${cartTotal.toFixed(2)}</p>
              </div>
              <button className="bg-white text-accent px-6 py-2 rounded-lg font-raleway font-semibold">
                View Cart
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SimpleMenuView;
