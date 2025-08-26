import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaList,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaImage
} from 'react-icons/fa';
import SingleRestaurantLayout from '../../components/owner/SingleRestaurantLayout';
import ImageUpload from '../../components/common/ImageUpload';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchMenuCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  hydrateMenuData
} from '../../store/slices/menuSlice';
import { usePlanRestrictions } from '../../components/subscription/PlanRestrictions';

const MenuCategories = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories = [], categoriesLoading: loading, categoriesError: error } = useSelector(state => state.menu);
  
  // Plan restrictions integration
  const { 
    subscription, 
    currentCounts, 
    checkLimit, 
    PlanStatusBadge, 
    FeatureRestriction, 
    LimitReachedModal,
    PaymentModal,
    PaymentSuccessModal
  } = usePlanRestrictions();

  // Debug logging to see what subscription data we have
  useEffect(() => {
    console.log('Restaurant MenuCategories - Subscription Debug:', {
      subscription,
      currentCounts,
      restaurantId,
      subscriptionKey: subscription?.key,
      maxCategories: subscription?.maxCategories,
      planType: subscription?.planType,
      categoriesLength: categories.length
    });
  }, [subscription, currentCounts, categories.length, restaurantId]);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    if (restaurantId) {
      // Use hydration for initial load to ensure all data is properly synchronized
      dispatch(hydrateMenuData({ entityId: restaurantId, entityType: 'restaurant' }));
    }
  }, [dispatch, restaurantId]);

  const handleAddCategory = () => {
    console.log('Restaurant HandleAddCategory called - Debug:', {
      subscription,
      currentCounts,
      categoriesLength: categories.length,
      maxCategories: subscription?.maxCategories,
      planType: subscription?.planType,
      key: subscription?.key
    });
    
    // Check if user can add more categories based on their restaurant plan
    const canAdd = checkLimit('categories');
    console.log('Restaurant CheckLimit result for categories:', canAdd);
    
    if (!canAdd) {
      return; // Modal will be shown by checkLimit
    }
    
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      isActive: true,
      sortOrder: categories.length + 1
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
      sortOrder: category.sortOrder
    });
    setShowModal(true);
  };

  const handleSaveCategory = async () => {
    if (editingCategory) {
      await dispatch(updateCategory({ 
        entityId: restaurantId,
        entityType: 'restaurant',
        categoryId: editingCategory.id, 
        categoryData: formData 
      }));
    } else {
      await dispatch(createCategory({ 
        entityId: restaurantId,
        entityType: 'restaurant',
        categoryData: formData 
      }));
    }
    setShowModal(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This will also remove all items in this category.')) {
      await dispatch(deleteCategory({ 
        entityId: restaurantId,
        entityType: 'restaurant',
        categoryId 
      }));
    }
  };

  const toggleCategoryStatus = async (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      await dispatch(updateCategory({ 
        entityId: restaurantId,
        entityType: 'restaurant',
        categoryId, 
        categoryData: { ...category, isActive: !category.isActive } 
      }));
    }
  };

  return (
    <SingleRestaurantLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Plan Status Badge */}
        <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-gray-900 dark:text-white mb-2">Menu Categories</h1>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm sm:text-base">Organize your menu items into categories</p>
            {subscription && (
              <p className="text-gray-500 dark:text-gray-400 font-raleway text-sm mt-1">
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
                onClick={() => {
                  if (restaurantId) {
                    navigate(`/tableserve/restaurant/${restaurantId}/upgrade`);
                  }
                }}
                className="mt-4 sm:mt-0 bg-gray-400 text-white px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
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
              className="mt-4 sm:mt-0 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Category</span>
            </motion.button>
          </FeatureRestriction>
        </div>

        {/* Loading and Error States */}
        {loading && <p>Loading categories...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* Categories Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="admin-card rounded-2xl overflow-hidden hover:border-accent/30 transition-all duration-300"
              >
                {/* Category Image */}
                <div className="h-48 bg-secondary relative overflow-hidden">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FaImage className="text-4xl text-tertiary" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-raleway ${category.isActive
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                      }`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Sort Order */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-black/50 text-white px-2 py-1 rounded text-sm font-raleway">
                      #{category.sortOrder}
                    </span>
                  </div>
                </div>

                {/* Category Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-fredoka text-secondary">{category.name}</h3>
                  </div>

                  <p className="text-secondary font-raleway text-sm mb-4 line-clamp-2">
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
                      onClick={() => toggleCategoryStatus(category.id)}
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
        )}

        {/* Empty State */}
        {!loading && !error && categories.length === 0 && (
          <div className="text-center py-12">
            <FaList className="text-6xl text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-primary mb-2">No Categories Found</h3>
            <p className="text-secondary font-raleway mb-4">Start by creating your first menu category.</p>
            <FeatureRestriction 
              feature="crudMenu" 
              subscription={subscription}
              fallback={
                <button
                  onClick={() => {
                    if (restaurantId) {
                      navigate(`/tableserve/restaurant/${restaurantId}/upgrade`);
                    }
                  }}
                  className="bg-gray-400 text-white px-6 py-3 rounded-xl font-raleway font-semibold"
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

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-theme-bg-primary border border-theme-border-primary rounded-2xl p-6 h-full overflow-y-auto w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-raleway font-bold text-theme-text-primary">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Category Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Appetizers, Main Courses"
                    className="bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary w-full px-4 py-3 rounded-lg font-raleway focus:outline-none focus:border-theme-accent-primary placeholder:text-theme-text-tertiary"
                  />
                </div>

                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this category"
                    rows="3"
                    className="bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary w-full px-4 py-3 rounded-lg font-raleway focus:outline-none focus:border-theme-accent-primary placeholder:text-theme-text-tertiary"
                  />
                </div>

                <div className='text-theme-text-primary'>
                  <label className="block text-theme-text-secondary font-raleway font-medium mb-2">Category Image</label>
                  <ImageUpload
                    currentImage={formData.image}
                    onImageChange={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
                    label="Upload category image"
                    size="large"
                    shape="rounded"
                    className='admin-card p-4 rounded-2xl'
                  />
                </div>

                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Sort Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                    className="bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary w-full px-4 py-3 rounded-lg font-raleway focus:outline-none focus:border-theme-accent-primary"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-accent"
                  />
                  <label htmlFor="isActive" className="text-theme-text-primary font-raleway">
                    Active (visible to customers)
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-theme-bg-secondary hover:bg-theme-bg-tertiary text-theme-text-primary py-3 rounded-lg font-raleway"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="flex-1 btn-primary py-3 rounded-lg font-raleway font-semibold"
                >
                  {editingCategory ? 'Update' : 'Create'} Category
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      
      {/* Plan Restriction Modals */}
      {LimitReachedModal}
      {PaymentModal}
      {PaymentSuccessModal}
    </SingleRestaurantLayout>
  );
};

export default MenuCategories;