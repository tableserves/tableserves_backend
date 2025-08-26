import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import LocalStorageService from '../../../services/LocalStorageService';
import { menuAPI } from '../../../services/api';
import {
  FaUtensils,
  FaStore,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaFilter,
  FaSearch,
  FaRupeeSign,
  FaStar,
  FaTimes,
  FaUpload,
  FaImage,
  FaCheck
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import { usePlanRestrictions } from '../../subscription/PlanRestrictions';

const ZoneMergedMenu = () => {
  const { zoneId } = useParams();
  
  // Plan restrictions integration for zones
  const { 
    subscription, 
    currentCounts, 
    checkLimit, 
    PlanStatusBadge, 
    FeatureRestriction, 
    LimitReachedModal,
    PaymentModal,
    PaymentSuccessModal,
    handleUpgrade
  } = usePlanRestrictions();
  
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedShop, setSelectedShop] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // Default sort by name
  const [sortOrder, setSortOrder] = useState('asc'); // Default sort ascending
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    shopId: '',
    image: null,
    imagePreview: null,
    isAvailable: true,
    preparationTime: '',
    ingredients: '',
    allergens: '',
    isVegetarian: false,
    isVegan: false,
    spiceLevel: 'mild'
  });

  const [availableCategories, setAvailableCategories] = useState(['all']);
  const [availableShopEntities, setAvailableShopEntities] = useState([]);
  const [zoneCategories, setZoneCategories] = useState([]);

  const spiceLevels = ['mild', 'medium', 'hot', 'very-hot'];

  const loadMergedMenu = async () => {
    setLoading(true);
    try {
      const allZoneEntities = LocalStorageService.getZoneShops(zoneId);

      let mergedMenuItems = [];
      let uniqueCategories = new Set();
      let uniqueShopNames = new Set();

      uniqueCategories.add('all');
      uniqueShopNames.add('all');

      // Fetch categories for the zone
      const fetchedZoneCategories = LocalStorageService.getZoneCategories(zoneId);
      console.log('Fetched zone categories:', fetchedZoneCategories);
      setZoneCategories(fetchedZoneCategories);

      for (const entity of allZoneEntities) {
        // Use LocalStorageService to get menu items for each shop/vendor
        const items = LocalStorageService.getMenuItems({ shopId: entity.id, zoneId: zoneId });

        const itemsWithShopInfo = items.map(item => ({
          ...item,
          shopName: entity.name,
          shopId: entity.id
        }));
        mergedMenuItems = [...mergedMenuItems, ...itemsWithShopInfo];
        itemsWithShopInfo.forEach(item => uniqueCategories.add(item.category));
        uniqueShopNames.add(entity.name);
      }

      // Add all zone categories to available categories (even if no menu items exist for them)
      console.log('Adding zone categories to filter:', fetchedZoneCategories);
      fetchedZoneCategories.forEach(zoneCat => {
        console.log('Processing zone category:', zoneCat);
        if (zoneCat.name && zoneCat.name !== 'all') {
          console.log('Adding category to filter:', zoneCat.name);
          uniqueCategories.add(zoneCat.name);
        }
      });

      const finalCategories = Array.from(uniqueCategories);
      console.log('Final available categories:', finalCategories);

      setMenuItems(mergedMenuItems);
      setFilteredItems(mergedMenuItems);
      setAvailableCategories(finalCategories);
      setAvailableShopEntities(allZoneEntities);
      setLoading(false);
    } catch (error) {
      console.error('Error loading merged menu:', error);
      setMenuItems([]);
      setFilteredItems([]);
      setAvailableCategories(['all']);
      setAvailableShopEntities([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMergedMenu();

    window.addEventListener('focus', loadMergedMenu);

    return () => {
      window.removeEventListener('focus', loadMergedMenu);
    };
  }, [zoneId]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewItem(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price || !newItem.category || !newItem.shopId) {
      alert('Please fill in all required fields');
      return;
    }

    const newMenuItemId = Math.max(...menuItems.map(item => item.id)) + 1;
    const selectedShopData = availableShopEntities.find(shop => shop.id === newItem.shopId);

    const menuItemToAdd = {
      id: newMenuItemId,
      name: newItem.name,
      description: newItem.description,
      price: parseFloat(newItem.price),
      category: newItem.category,
      shopName: selectedShopData?.name || 'Unknown Shop',
      shopId: newItem.shopId,
      image: newItem.imagePreview || '/api/placeholder/300/200',
      isAvailable: newItem.isAvailable,
      rating: 0,
      orders: 0,
      preparationTime: newItem.preparationTime,
      ingredients: newItem.ingredients,
      allergens: newItem.allergens,
      isVegetarian: newItem.isVegetarian,
      isVegan: newItem.isVegan,
      spiceLevel: newItem.spiceLevel,
      addedByZoneAdmin: true
    };

    setMenuItems(prev => [...prev, menuItemToAdd]);
    setFilteredItems(prev => [...prev, menuItemToAdd]);

    // Save to localStorage
    try {
      const existingItems = LocalStorageService.getMenuItems({ shopId: newItem.shopId, zoneId: zoneId });
      const updatedItems = [...existingItems, menuItemToAdd];
      localStorage.setItem(`vendor_menu_items_${newItem.shopId}`, JSON.stringify(updatedItems));
      console.log(`Saved new menu item to localStorage for shop ${newItem.shopId}`);


    } catch (error) {
      console.error('Error saving menu item to localStorage:', error);
    }

    // Reset form
    setNewItem({
      name: '',
      description: '',
      price: '',
      category: '',
      shopId: '',
      image: null,
      imagePreview: null,
      isAvailable: true,
      preparationTime: '',
      ingredients: '',
      allergens: '',
      isVegetarian: false,
      isVegan: false,
      spiceLevel: 'mild'
    });

    setShowAddModal(false);
    alert('Menu item added successfully!');
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setNewItem({
      name: '',
      description: '',
      price: '',
      category: '',
      shopId: '',
      image: null,
      imagePreview: null,
      isAvailable: true,
      preparationTime: '',
      ingredients: '',
      allergens: '',
      isVegetarian: false,
      isVegan: false,
      spiceLevel: 'mild'
    });
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      shopId: item.shopId,
      image: null,
      imagePreview: item.image,
      isAvailable: item.isAvailable,
      preparationTime: item.preparationTime || '',
      ingredients: item.ingredients || '',
      allergens: item.allergens || '',
      isVegetarian: item.isVegetarian || false,
      isVegan: item.isVegan || false,
      spiceLevel: item.spiceLevel || 'mild'
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = () => {
    if (!newItem.name || !newItem.price || !newItem.category || !newItem.shopId) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedShopData = availableShopEntities.find(shop => shop.id === newItem.shopId);

    const updatedItem = {
      ...editingItem,
      name: newItem.name,
      description: newItem.description,
      price: parseFloat(newItem.price),
      category: newItem.category,
      shopName: selectedShopData?.name || 'Unknown Shop',
      shopId: newItem.shopId,
      image: newItem.imagePreview,
      isAvailable: newItem.isAvailable,
      preparationTime: newItem.preparationTime,
      ingredients: newItem.ingredients,
      allergens: newItem.allergens,
      isVegetarian: newItem.isVegetarian,
      isVegan: newItem.isVegan,
      spiceLevel: newItem.spiceLevel
    };

    setMenuItems(prev => prev.map(item =>
      item.id === editingItem.id ? updatedItem : item
    ));
    setFilteredItems(prev => prev.map(item =>
      item.id === editingItem.id ? updatedItem : item
    ));

    // Save to localStorage
    try {
      const existingItems = LocalStorageService.getMenuItems({ shopId: updatedItem.shopId, zoneId: zoneId });
      const updatedItems = existingItems.map(item =>
        item.id === editingItem.id ? updatedItem : item
      );
      localStorage.setItem(`vendor_menu_items_${updatedItem.shopId}`, JSON.stringify(updatedItems));
      console.log(`Updated menu item in localStorage for shop ${updatedItem.shopId}`);


    } catch (error) {
      console.error('Error updating menu item in localStorage:', error);
    }

    handleCloseEditModal();

    // Show success message with item name
    alert(`"${newItem.name}" has been updated successfully!`);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setNewItem({
      name: '',
      description: '',
      price: '',
      category: '',
      shopId: '',
      image: null,
      imagePreview: null,
      isAvailable: true,
      preparationTime: '',
      ingredients: '',
      allergens: '',
      isVegetarian: false,
      isVegan: false,
      spiceLevel: 'mild'
    });
  };

  useEffect(() => {
    let filtered = [...menuItems]; // Create a mutable copy

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shopName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by shop
    if (selectedShop !== 'all') {
      filtered = filtered.filter(item => item.shopName === selectedShop);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'price':
          valA = a.price;
          valB = b.price;
          break;
        case 'category':
          valA = a.category.toLowerCase();
          valB = b.category.toLowerCase();
          break;
        case 'shopName':
          valA = a.shopName.toLowerCase();
          valB = b.shopName.toLowerCase();
          break;
        case 'rating':
          valA = a.rating;
          valB = b.rating;
          break;
        case 'orders':
          valA = a.orders;
          valB = b.orders;
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredItems(filtered);
  }, [searchQuery, selectedCategory, selectedShop, sortBy, sortOrder, menuItems]);

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading Zone Menu...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Plan Status Badge */}
        <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Zone Merged Menu
            </h1>
            <p className="text-theme-text-secondary font-raleway">
              View and manage all menu items from shops in your zone
            </p>
            {subscription && (
              <p className="text-theme-text-tertiary font-raleway text-sm mt-1">
                Menu Items: {menuItems.length} / {subscription.maxMenuItems || 'Unlimited'} per category
              </p>
            )}
          </div>
          <FeatureRestriction 
            feature="crudMenu" 
            subscription={subscription}
            fallback={
              <button
                onClick={handleUpgrade}
                className="btn-secondary px-4 py-2 rounded-lg font-raleway flex items-center space-x-2 hover:scale-105 transition-transform"
              >
                <FaPlus />
                <span>Upgrade to Add Items</span>
              </button>
            }
          >
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-4 py-2 rounded-lg font-raleway flex items-center space-x-2 hover:scale-105 transition-transform"
            >
              <FaPlus />
              <span>Add Menu Item</span>
            </button>
          </FeatureRestriction>
        </div>

        {/* Filters */}
        <div className="admin-card rounded-xl p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-theme rounded-lg pl-10 pr-4 py-2 w-full"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none autofill-protected"
            >
              {availableCategories.map((category, index) => (
                <option key={`category-${index}-${category}`} value={category} className="bg-theme-bg-secondary text-theme-text-primary">
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            {/* Shop Filter */}
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none autofill-protected"
            >
              <option value="all" className="bg-theme-bg-secondary text-theme-text-primary">
                All Shops
              </option>
              {availableShopEntities.map((shop, index) => (
                <option key={`shop-${shop.id}-${index}`} value={shop.name} className="bg-theme-bg-secondary text-theme-text-primary">
                  {shop.name} ({shop.type || 'Vendor'})
                </option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none autofill-protected"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="category">Sort by Category</option>
              <option value="shopName">Sort by Shop</option>
              <option value="rating">Sort by Rating</option>
              <option value="orders">Sort by Orders</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none autofill-protected"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>

            {/* Results Count */}
            <div className="flex items-center justify-center admin-card rounded-lg px-4 py-2">
              <span className="text-theme-text-secondary font-raleway text-sm">
                {filteredItems.length} items found
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Item Image */}
              <div className="relative h-48 bg-theme-bg-secondary">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-raleway ${item.isAvailable
                    ? 'bg-status-success text-white'
                    : 'bg-status-error text-white'
                    }`}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  {item.addedByZoneAdmin && (
                    <span className="px-2 py-1 rounded-full text-xs font-raleway bg-theme-accent-primary text-white">
                      Zone Added
                    </span>
                  )}
                </div>
              </div>

              {/* Item Details */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-fredoka text-theme-text-primary">
                    {item.name}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <FaStar className="text-yellow-400 text-sm" />
                    <span className="text-theme-text-secondary text-sm font-raleway">
                      {item.rating}
                    </span>
                  </div>
                </div>

                <p className="text-theme-text-secondary font-raleway text-sm mb-3">
                  {item.description}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-1">
                    <FaRupeeSign className="text-theme-accent-primary text-lg" />
                    <span className="text-xl font-fredoka text-theme-text-primary">
                      {item.price}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FaStore className="text-theme-text-tertiary text-sm" />
                    <span className="text-theme-text-secondary text-sm font-raleway">
                      {item.shopName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-theme-text-tertiary text-xs font-raleway">
                    {item.orders} orders
                  </span>
                  <div className="flex items-center space-x-2">
                    {item.addedByZoneAdmin && (
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-theme-text-secondary hover:text-theme-accent-primary transition-colors p-1"
                        title="Edit item (Zone Admin)"
                      >
                        <FaEdit />
                      </button>
                    )}

                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <FaUtensils className="text-6xl text-theme-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">
              No menu items found
            </h3>
            <p className="text-theme-text-secondary font-raleway">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* Add Menu Item Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="admin-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-fredoka text-theme-text-primary">Add New Menu Item</h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-theme-text-secondary hover:text-theme-text-primary transition-colors p-2"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Basic Information</h3>

                    {/* Item Name */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        placeholder="Enter item name"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Description
                      </label>
                      <textarea
                        value={newItem.description}
                        onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none h-24 resize-none"
                        placeholder="Enter item description"
                      />
                    </div>

                    {/* Price and Preparation Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          value={newItem.price}
                          onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                          Prep Time (mins)
                        </label>
                        <input
                          type="number"
                          value={newItem.preparationTime}
                          onChange={(e) => setNewItem(prev => ({ ...prev, preparationTime: e.target.value }))}
                          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                          placeholder="15"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Category and Shop */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                          Category *
                        </label>
                        <select
                          value={newItem.category}
                          onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        >
                          <option value="">Select Category</option>
                          {zoneCategories.filter(cat => cat.id !== 'all').map(category => (
                            <option key={category.id} value={category.name}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                          Shop *
                        </label>
                        <select
                          value={newItem.shopId}
                          onChange={(e) => setNewItem(prev => ({ ...prev, shopId: e.target.value }))}
                          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        >
                          <option value="">Select Shop</option>
                          {availableShopEntities.map(shop => (
                            <option key={shop.id} value={shop.id}>
                              {shop.name} ({shop.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Additional Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Additional Details</h3>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Item Image
                      </label>
                      <div className="border-2 border-dashed border-theme-border-primary rounded-lg p-4 text-center">
                        {newItem.imagePreview ? (
                          <div className="relative">
                            <img
                              src={newItem.imagePreview}
                              alt="Preview"
                              className="w-full h-32 object-cover rounded-lg mb-2"
                            />
                            <button
                              onClick={() => setNewItem(prev => ({ ...prev, image: null, imagePreview: null }))}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <FaImage className="text-4xl text-theme-text-tertiary mx-auto mb-2" />
                            <p className="text-theme-text-secondary font-raleway text-sm mb-2">
                              Click to upload image
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="btn-secondary px-4 py-2 rounded-lg font-raleway cursor-pointer inline-flex items-center space-x-2"
                        >
                          <FaUpload />
                          <span>Upload Image</span>
                        </label>
                      </div>
                    </div>

                    {/* Ingredients */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Ingredients
                      </label>
                      <textarea
                        value={newItem.ingredients}
                        onChange={(e) => setNewItem(prev => ({ ...prev, ingredients: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none h-20 resize-none"
                        placeholder="List main ingredients (comma separated)"
                      />
                    </div>

                    {/* Allergens */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Allergens
                      </label>
                      <input
                        type="text"
                        value={newItem.allergens}
                        onChange={(e) => setNewItem(prev => ({ ...prev, allergens: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        placeholder="e.g., Nuts, Dairy, Gluten"
                      />
                    </div>

                    {/* Spice Level */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Spice Level
                      </label>
                      <select
                        value={newItem.spiceLevel}
                        onChange={(e) => setNewItem(prev => ({ ...prev, spiceLevel: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                      >
                        {spiceLevels.map(level => (
                          <option key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1).replace('-', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isVegetarian"
                          checked={newItem.isVegetarian}
                          onChange={(e) => setNewItem(prev => ({ ...prev, isVegetarian: e.target.checked }))}
                          className="w-4 h-4 text-theme-accent-primary bg-theme-bg-secondary border-theme-border-primary rounded focus:ring-theme-accent-primary"
                        />
                        <label htmlFor="isVegetarian" className="text-theme-text-primary font-raleway">
                          Vegetarian
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isVegan"
                          checked={newItem.isVegan}
                          onChange={(e) => setNewItem(prev => ({ ...prev, isVegan: e.target.checked }))}
                          className="w-4 h-4 text-theme-accent-primary bg-theme-bg-secondary border-theme-border-primary rounded focus:ring-theme-accent-primary"
                        />
                        <label htmlFor="isVegan" className="text-theme-text-primary font-raleway">
                          Vegan
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isAvailable"
                          checked={newItem.isAvailable}
                          onChange={(e) => setNewItem(prev => ({ ...prev, isAvailable: e.target.checked }))}
                          className="w-4 h-4 text-theme-accent-primary bg-theme-bg-secondary border-theme-border-primary rounded focus:ring-theme-accent-primary"
                        />
                        <label htmlFor="isAvailable" className="text-theme-text-primary font-raleway">
                          Available for ordering
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-theme-border-primary">
                  <button
                    onClick={handleCloseModal}
                    className="btn-secondary px-6 py-2 rounded-lg font-raleway"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddItem}
                    className="btn-primary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2"
                  >
                    <FaCheck />
                    <span>Add Menu Item</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Menu Item Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && handleCloseEditModal()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="admin-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-fredoka text-theme-text-primary">Edit Menu Item</h2>
                  <button
                    onClick={handleCloseEditModal}
                    className="text-theme-text-secondary hover:text-theme-text-primary transition-colors p-2"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                {/* Modal Content - Same as Add Modal */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Basic Information</h3>

                    {/* Item Name */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        placeholder="Enter item name"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Description
                      </label>
                      <textarea
                        value={newItem.description}
                        onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none h-24 resize-none"
                        placeholder="Enter item description"
                      />
                    </div>

                    {/* Price and Preparation Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          value={newItem.price}
                          onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                          Prep Time (mins)
                        </label>
                        <input
                          type="number"
                          value={newItem.preparationTime}
                          onChange={(e) => setNewItem(prev => ({ ...prev, preparationTime: e.target.value }))}
                          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                          placeholder="15"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Category and Shop */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                          Category *
                        </label>
                        <select
                          value={newItem.category}
                          onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        >
                          <option value="">Select Category</option>
                          {zoneCategories.filter(cat => cat.id !== 'all').map(category => (
                            <option key={category.id} value={category.name}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                          Shop *
                        </label>
                        <select
                          value={newItem.shopId}
                          onChange={(e) => setNewItem(prev => ({ ...prev, shopId: e.target.value }))}
                          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        >
                          <option value="">Select Shop</option>
                          {availableShopEntities.map(shop => (
                            <option key={shop.id} value={shop.id}>
                              {shop.name} ({shop.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Additional Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Additional Details</h3>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Item Image
                      </label>
                      <div className="border-2 border-dashed border-theme-border-primary rounded-lg p-4 text-center">
                        {newItem.imagePreview ? (
                          <div className="relative">
                            <img
                              src={newItem.imagePreview}
                              alt="Preview"
                              className="w-full h-32 object-cover rounded-lg mb-2"
                            />
                            <button
                              onClick={() => setNewItem(prev => ({ ...prev, image: null, imagePreview: null }))}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <FaImage className="text-4xl text-theme-text-tertiary mx-auto mb-2" />
                            <p className="text-theme-text-secondary font-raleway text-sm mb-2">
                              Click to upload image
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="edit-image-upload"
                        />
                        <label
                          htmlFor="edit-image-upload"
                          className="btn-secondary px-4 py-2 rounded-lg font-raleway cursor-pointer inline-flex items-center space-x-2"
                        >
                          <FaUpload />
                          <span>Upload Image</span>
                        </label>
                      </div>
                    </div>

                    {/* Ingredients */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Ingredients
                      </label>
                      <textarea
                        value={newItem.ingredients}
                        onChange={(e) => setNewItem(prev => ({ ...prev, ingredients: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none h-20 resize-none"
                        placeholder="List main ingredients (comma separated)"
                      />
                    </div>

                    {/* Allergens */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Allergens
                      </label>
                      <input
                        type="text"
                        value={newItem.allergens}
                        onChange={(e) => setNewItem(prev => ({ ...prev, allergens: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        placeholder="e.g., Nuts, Dairy, Gluten"
                      />
                    </div>

                    {/* Spice Level */}
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Spice Level
                      </label>
                      <select
                        value={newItem.spiceLevel}
                        onChange={(e) => setNewItem(prev => ({ ...prev, spiceLevel: e.target.value }))}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                      >
                        {spiceLevels.map(level => (
                          <option key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1).replace('-', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="edit-isVegetarian"
                          checked={newItem.isVegetarian}
                          onChange={(e) => setNewItem(prev => ({ ...prev, isVegetarian: e.target.checked }))}
                          className="w-4 h-4 text-theme-accent-primary bg-theme-bg-secondary border-theme-border-primary rounded focus:ring-theme-accent-primary"
                        />
                        <label htmlFor="edit-isVegetarian" className="text-theme-text-primary font-raleway">
                          Vegetarian
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="edit-isVegan"
                          checked={newItem.isVegan}
                          onChange={(e) => setNewItem(prev => ({ ...prev, isVegan: e.target.checked }))}
                          className="w-4 h-4 text-theme-accent-primary bg-theme-bg-secondary border-theme-border-primary rounded focus:ring-theme-accent-primary"
                        />
                        <label htmlFor="edit-isVegan" className="text-theme-text-primary font-raleway">
                          Vegan
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="edit-isAvailable"
                          checked={newItem.isAvailable}
                          onChange={(e) => setNewItem(prev => ({ ...prev, isAvailable: e.target.checked }))}
                          className="w-4 h-4 text-theme-accent-primary bg-theme-bg-secondary border-theme-border-primary rounded focus:ring-theme-accent-primary"
                        />
                        <label htmlFor="edit-isAvailable" className="text-theme-text-primary font-raleway">
                          Available for ordering
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-theme-border-primary">
                  <button
                    onClick={handleCloseEditModal}
                    className="btn-secondary px-6 py-2 rounded-lg font-raleway"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateItem}
                    className="btn-primary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2"
                  >
                    <FaCheck />
                    <span>Update Menu Item</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Plan Restriction Modals for Zones */}
        {LimitReachedModal}
        {PaymentModal}
        {PaymentSuccessModal}
      </motion.div>
    </ZoneAdminLayout>
  );
};

export default ZoneMergedMenu;
