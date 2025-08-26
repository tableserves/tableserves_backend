import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaList,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaImage,
  FaStore
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import ImageUpload from '../../common/ImageUpload';
import { 
  fetchMenuCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../../../store/slices/menuSlice';
import { usePlanRestrictions } from '../../subscription/PlanRestrictions';

const ZoneMenuCategories = () => {
  const { zoneId } = useParams();
  const dispatch = useDispatch();
  const { categories = [], categoriesLoading: loading, categoriesError: error } = useSelector(state => state.menu);
  
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

  // Debug logging to see what subscription data we have
  useEffect(() => {
    console.log('ZoneMenuCategories - Subscription Debug:', {
      subscription,
      currentCounts,
      zoneId,
      subscriptionKey: subscription?.key,
      maxCategories: subscription?.maxCategories,
      planType: subscription?.planType,
      categoriesLength: categories.length
    });
  }, [subscription, currentCounts, categories.length, zoneId]);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    isActive: true,
    sortOrder: 0,
    availableForShops: 'all'
  });

  useEffect(() => {
    if (zoneId) {
      dispatch(fetchMenuCategories({ entityId: zoneId, entityType: 'zone' }));
    }
  }, [dispatch, zoneId]);

  const handleAddCategory = () => {
    console.log('HandleAddCategory called - Debug:', {
      subscription,
      currentCounts,
      categoriesLength: categories.length,
      maxCategories: subscription?.maxCategories,
      planType: subscription?.planType,
      key: subscription?.key
    });
    
    // Check if user can add more categories based on their zone plan
    const canAdd = checkLimit('categories');
    console.log('CheckLimit result for categories:', canAdd);
    
    if (!canAdd) {
      return; // Modal will be shown by checkLimit
    }
    
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      isActive: true,
      sortOrder: categories.length + 1,
      availableForShops: 'all'
    });
    setShowModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      availableForShops: category.availableForShops || 'all'
    });
    setShowModal(true);
  };

  const isFormValid = () => {
    return formData.name.trim() !== '' && formData.description.trim() !== '';
  };

  const handleSaveCategory = () => {
    if (!isFormValid()) {
      alert('Please fill in all required fields.');
      return;
    }

    if (editingCategory) {
      dispatch(updateCategory({ 
        entityId: zoneId,
        entityType: 'zone',
        categoryId: editingCategory.id, 
        categoryData: formData 
      }));
    } else {
      dispatch(createCategory({ 
        entityId: zoneId,
        entityType: 'zone',
        categoryData: formData 
      }));
    }
    setShowModal(false);
  };

  const handleDeleteCategory = (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This will affect all shops in the zone.')) {
      dispatch(deleteCategory({ 
        entityId: zoneId,
        entityType: 'zone',
        categoryId 
      }));
    }
  };

  const toggleCategoryStatus = (category) => {
    dispatch(updateCategory({
      entityId: zoneId,
      entityType: 'zone',
      categoryId: category.id,
      categoryData: { ...category, isActive: !category.isActive }
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
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Zone Menu Categories</h1>
            <p className="text-secondary font-raleway text-sm sm:text-base">Manage categories available to all shops in your zone</p>
            {subscription && (
              <p className="text-theme-text-tertiary font-raleway text-sm mt-1">
                Categories: {categories.length} / {subscription.maxCategories || 'Unlimited'}
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
                <span>Upgrade to Add Categories</span>
              </motion.button>
            }
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddCategory}
              className="mt-4 sm:mt-0 btn-primary px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Category</span>
            </motion.button>
          </FeatureRestriction>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card rounded-2xl overflow-hidden hover:border-accent/30 transition-all duration-300"
            >
               <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-fredoka text-secondary">{category.name}</h3>
                </div>
                <p className="text-secondary font-raleway text-sm mb-3 line-clamp-2">
                  {category.description || 'No description provided'}
                </p>
                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-raleway text-sm flex items-center justify-center space-x-1"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => toggleCategoryStatus(category)}
                    className={`flex-1 py-2 rounded-lg font-raleway text-sm flex items-center justify-center space-x-1 ${category.isActive
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                  >
                    {category.isActive ? <FaEyeSlash /> : <FaEye />}
                    <span>{category.isActive ? 'Hide' : 'Show'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
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
        {!loading && categories.length === 0 && (
          <div className="text-center py-12">
            <FaList className="text-6xl text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-primary mb-2">No Categories Found</h3>
            <p className="text-secondary font-raleway mb-4">Create categories that all shops in your zone can use.</p>
            <FeatureRestriction 
              feature="crudMenu" 
              subscription={subscription}
              fallback={
                <button
                  onClick={handleUpgrade}
                  className="btn-secondary px-6 py-3 rounded-xl font-raleway font-semibold"
                >
                  Upgrade to Create Categories
                </button>
              }
            >
              <button
                onClick={handleAddCategory}
                className="btn-primary px-6 py-3 rounded-xl font-raleway font-semibold"
              >
                Create First Category
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
                className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-fredoka text-secondary">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Category Name */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway"
                      placeholder="Enter category name"
                      required
                    />
                  </div>

                  {/* Category Description */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent font-raleway h-24 resize-none"
                      placeholder="Describe this category"
                      required
                    />
                  </div>

                  {/* Category Image */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Category Image
                    </label>
                    <ImageUpload
                      value={formData.image}
                      onChange={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
                      placeholder="Upload category image"
                    />
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

                  {/* Active Status */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-secondary">
                      Category is active and visible to shops
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-secondary  text-secondary py-3 rounded-lg font-raleway"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    disabled={!isFormValid()}
                    className={`flex-1 py-3 rounded-lg font-raleway font-semibold transition-all duration-200 ${isFormValid()
                      ? 'btn-primary hover:bg-accent/90 cursor-pointer'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                  >
                    {editingCategory ? 'Update' : 'Create'} Category
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

export default ZoneMenuCategories;
