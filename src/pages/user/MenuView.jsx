import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaStar } from 'react-icons/fa';
import { addItem } from '../../store/slices/cartSlice';
import { fetchMenuByRestaurant } from '../../store/slices/menuSlice';

const MenuView = () => {
  const { restaurantName } = useParams();
  const dispatch = useDispatch();
  const { items: menuItems, categories, loading } = useSelector((state) => state.menu);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchMenuByRestaurant(restaurantName));
  }, [dispatch, restaurantName]);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item) => {
    dispatch(addItem({ item, quantity: 1 }));
    // Optional: Show success message
  };

  return (
    <div className="min-h-screen p-6">
      {/* Restaurant Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-fredoka text-white mb-2">{restaurantName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
        <p className="text-white/70 font-raleway">Welcome to our restaurant!</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-6"
      >
        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" />
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-accent"
        />
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex space-x-2 mb-8 overflow-x-auto"
      >
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-6 py-3 rounded-lg font-raleway font-semibold whitespace-nowrap transition-colors ${activeCategory === 'all'
              ? 'bg-accent text-white'
              : 'bg-white/10 text-white/70 hover:text-white'
            }`}
        >
          All Items
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-6 py-3 rounded-lg font-raleway font-semibold whitespace-nowrap transition-colors ${activeCategory === category.id
                ? 'bg-accent text-white'
                : 'bg-white/10 text-white/70 hover:text-white'
              }`}
          >
            {category.name}
          </button>
        ))}
      </motion.div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden border border-white/10"
          >
            <div className="relative">
              <img
                src={item.image || '/api/placeholder/300/200'}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className={`px-2 py-1 rounded-full text-xs font-raleway ${item.isVeg ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                  {item.isVeg ? 'VEG' : 'NON-VEG'}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-fredoka text-white">{item.name}</h3>
                <div className="flex items-center space-x-1">
                  <FaStar className="w-4 h-4 text-yellow-400" />
                  <span className="text-white/70 font-raleway text-sm">{item.rating || 'N/A'}</span>
                </div>
              </div>

              <p className="text-white/70 font-raleway text-sm mb-4">{item.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-2xl font-fredoka text-accent">${item.price}</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addToCart(item)}
                  className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  <span className="font-raleway">Add</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MenuView;



