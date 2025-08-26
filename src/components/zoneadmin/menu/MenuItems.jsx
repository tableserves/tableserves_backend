import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaUtensils,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaImage,
  FaStore,
  FaSearch,
  FaFilter,
  FaRupeeSign,
  FaStar
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import ImageUpload from '../../common/ImageUpload';
import { 
  fetchMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  fetchMenuCategories 
} from '../../../store/slices/menuSlice';
import { usePlanRestrictions } from '../../subscription/PlanRestrictions';

const ZoneMenuItems = () => {
  const { zoneId } = useParams();
  const dispatch = useDispatch();
  const { items = [], itemsLoading: loading, itemsError: error } = useSelector(state => state.menu);
  const { categories = [] } = useSelector(state => state.menu);
  
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

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: '',
    isAvailable: true,
    preparationTime: '',
    ingredients: '',
    allergens: '',
    spiceLevel: 'mild',
    isVegetarian: false,
    isVegan: false,
    availableForShops: 'all'
  });

  useEffect(() => {
    if (zoneId) {
      dispatch(fetchMenuItems({ entityId: zoneId, entityType: 'zone' }));
      dispatch(fetchMenuCategories({ entityId: zoneId, entityType: 'zone' }));
    }
  }, [dispatch, zoneId]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryName = categories.find(c => c.id === item.categoryId)?.name || '';
    const matchesCategory = categoryFilter === 'all' || categoryName === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = () => {
    // Check if user can add more items based on their zone plan
    if (!checkLimit('menuItems')) {
      return; // Modal will be shown by checkLimit
    }
    
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      image: '',
      isAvailable: true,
      preparationTime: '',
      ingredients: '',
      allergens: '',
      spiceLevel: 'mild',
      isVegetarian: false,
      isVegan: false,
      availableForShops: 'all'
    });
    setShowModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      categoryId: item.categoryId,
      image: item.image,
      isAvailable: item.isAvailable,
      preparationTime: item.preparationTime?.toString() || '',
      ingredients: item.ingredients || '',
      allergens: item.allergens || '',
      spiceLevel: item.spiceLevel || 'mild',
      isVegetarian: item.isVegetarian || false,
      isVegan: item.isVegan || false,
      availableForShops: item.availableForShops || 'all'
    });
    setShowModal(true);
  };

  const isFormValid = () => {
    return formData.name.trim() !== '' && 
           formData.description.trim() !== '' && 
           formData.price.trim() !== '' && 
           formData.categoryId !== '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveItem = () => {
    if (!isFormValid()) {
      alert('Please fill in all required fields.');
      return;
    }

    const itemData = {
      ...formData,
      price: parseFloat(formData.price),
      preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : null
    };

    if (editingItem) {
      dispatch(updateMenuItem({ 
        entityId: zoneId,
        entityType: 'zone',
        itemId: editingItem.id, 
        itemData 
      }));
    } else {
      dispatch(createMenuItem({ 
        entityId: zoneId,
        entityType: 'zone',
        categoryId: itemData.categoryId,
        itemData 
      }));
    }
    setShowModal(false);
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to delete this menu item? This will affect all shops in the zone.')) {
      dispatch(deleteMenuItem({ 
        entityId: zoneId,
        entityType: 'zone',
        itemId 
      }));
    }
  };

  const toggleItemAvailability = (item) => {
    dispatch(updateMenuItem({
      entityId: zoneId,
      entityType: 'zone',
      itemId: item.id,
      itemData: { ...item, isAvailable: !item.isAvailable }
    }));
  };

  return (
    <ZoneAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Plan Status Badge */}
        <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Zone Menu Items</h1>
            <p className="text-secondary font-raleway text-sm sm:text-base">Manage menu items available to all shops in your zone</p>
            {subscription && (
              <p className="text-theme-text-tertiary font-raleway text-sm mt-1">
                Menu Items: {items.length} / {subscription.maxMenuItems || 'Unlimited'}
              </p>
            )}
          </div>
          <FeatureRestriction 
            feature="crudMenu" 
            subscription={subscription}
            fallback={
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpgrade}
                className="mt-4 sm:mt-0 btn-secondary px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
              >
                <FaPlus />
                <span>Upgrade to Add Items</span>
              </motion.button>
            }
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddItem}
              className="mt-4 sm:mt-0 btn-primary px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Menu Item</span>
            </motion.button>
          </FeatureRestriction>
        </div>

        {/* Search and Filters */}
        <div className="admin-card rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-theme rounded-lg pl-10 pr-4 py-2 w-full focus:outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card rounded-2xl overflow-hidden hover:border-accent/30 transition-all duration-300"
            >
              {/* Item Image */}
              <div className="relative h-48 bg-gray-200">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaUtensils className="text-4xl text-gray-400" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-raleway ${item.isAvailable
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                    }`}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  {item.isVegetarian && (
                    <span className="px-2 py-1 rounded-full text-xs font-raleway bg-green-100 text-green-800">
                      Veg
                    </span>
                  )}
                  {item.isVegan && (
                    <span className="px-2 py-1 rounded-full text-xs font-raleway bg-green-200 text-green-900">
                      Vegan
                    </span>
                  )}
                </div>
              </div>

              {/* Item Details */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-fredoka text-secondary">{item.name}</h3>
                  <div className="flex items-center space-x-1">
                    <FaRupeeSign className="text-accent text-lg" />
                    <span className="text-xl font-fredoka text-secondary">{item.price}</span>
                  </div>
                </div>
                
                <p className="text-secondary font-raleway text-sm mb-3 line-clamp-2">
                  {item.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-raleway text-theme-text-tertiary">
                    {categories.find(c => c.id === item.categoryId)?.name || 'No Category'}
                  </span>
                  {item.preparationTime && (
                    <span className="text-sm font-raleway text-theme-text-tertiary">
                      {item.preparationTime} mins
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-raleway text-sm flex items-center justify-center space-x-1"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => toggleItemAvailability(item)}
                    className={`flex-1 py-2 rounded-lg font-raleway text-sm flex items-center justify-center space-x-1 ${item.isAvailable
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                  >
                    {item.isAvailable ? <FaEyeSlash /> : <FaEye />}
                    <span>{item.isAvailable ? 'Hide' : 'Show'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-raleway text-sm flex items-center justify-center space-x-1"
                  >
                    <FaTrash />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <FaUtensils className="text-6xl text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-primary mb-2">No Menu Items Found</h3>
            <p className="text-secondary font-raleway mb-4">Create menu items that all shops in your zone can use.</p>
            <FeatureRestriction 
              feature="crudMenu" 
              subscription={subscription}
              fallback={
                <button
                  onClick={handleUpgrade}
                  className="btn-secondary px-6 py-3 rounded-xl font-raleway font-semibold"
                >
                  Upgrade to Create Items
                </button>
              }
            >
              <button
                onClick={handleAddItem}
                className="btn-primary px-6 py-3 rounded-xl font-raleway font-semibold"
              >
                Create First Menu Item
              </button>
            </FeatureRestriction>
          </div>
        )}
        
        {/* Plan Restriction Modals for Zones */}
        {LimitReachedModal}
        {PaymentModal}
        {PaymentSuccessModal}

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="admin-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-fredoka text-secondary">
                    {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-fredoka text-secondary mb-4">Basic Information</h3>

                    {/* Item Name */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway"
                        placeholder="Enter item name"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway h-24 resize-none"
                        placeholder="Describe this menu item"
                        required
                      />
                    </div>

                    {/* Price and Prep Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway"
                          placeholder="0"
                          min="0"
                          step="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Prep Time (mins)
                        </label>
                        <input
                          type="number"
                          value={formData.preparationTime}
                          onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway"
                          placeholder="15"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Category *
                      </label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway"
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Column - Additional Details */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-fredoka text-secondary mb-4">Additional Details</h3>

                    {/* Item Image */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Item Image
                      </label>
                      <ImageUpload
                        value={formData.image}
                        onChange={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
                        placeholder="Upload item image"
                      />
                    </div>

                    {/* Ingredients */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Ingredients
                      </label>
                      <textarea
                        value={formData.ingredients}
                        onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway h-20 resize-none"
                        placeholder="List main ingredients (comma separated)"
                      />
                    </div>

                    {/* Allergens */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Allergens
                      </label>
                      <input
                        type="text"
                        value={formData.allergens}
                        onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway"
                        placeholder="e.g., Nuts, Dairy, Gluten"
                      />
                    </div>

                    {/* Spice Level */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Spice Level
                      </label>
                      <select
                        value={formData.spiceLevel}
                        onChange={(e) => setFormData({ ...formData, spiceLevel: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway"
                      >
                        <option value="mild">Mild</option>
                        <option value="medium">Medium</option>
                        <option value="hot">Hot</option>
                        <option value="very-hot">Very Hot</option>
                      </select>
                    </div>

                    {/* Available for Shops */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Available For
                      </label>
                      <select
                        value={formData.availableForShops}
                        onChange={(e) => setFormData({ ...formData, availableForShops: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway"
                      >
                        <option value="all">All Shops in Zone</option>
                        <option value="selected">Selected Shops Only</option>
                      </select>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isVegetarian"
                          checked={formData.isVegetarian}
                          onChange={(e) => setFormData({ ...formData, isVegetarian: e.target.checked })}
                          className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
                        />
                        <label htmlFor="isVegetarian" className="text-sm font-medium text-secondary">
                          Vegetarian
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isVegan"
                          checked={formData.isVegan}
                          onChange={(e) => setFormData({ ...formData, isVegan: e.target.checked })}
                          className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
                        />
                        <label htmlFor="isVegan" className="text-sm font-medium text-secondary">
                          Vegan
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isAvailable"
                          checked={formData.isAvailable}
                          onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                          className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
                        />
                        <label htmlFor="isAvailable" className="text-sm font-medium text-secondary">
                          Available for ordering
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-secondary text-secondary py-3 rounded-lg font-raleway"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveItem}
                    disabled={!isFormValid()}
                    className={`flex-1 py-3 rounded-lg font-raleway font-semibold transition-all duration-200 ${isFormValid()
                      ? 'btn-primary hover:bg-accent/90 cursor-pointer'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                  >
                    {editingItem ? 'Update' : 'Create'} Menu Item
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        {/* Plan Restriction Modals for Zones */}
        {LimitReachedModal}
        {PaymentModal}
        {PaymentSuccessModal}
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneMenuItems;