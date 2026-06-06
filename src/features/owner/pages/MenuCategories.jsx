import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaList,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaSpinner,
  FaInfoCircle
} from 'react-icons/fa';
import SingleRestaurantLayout from '../components/SingleRestaurantLayout';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMenuCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  hydrateMenuData
} from '../../../store/slices/menuSlice';
import { usePlanRestrictions } from '../../subscription/components/PlanRestrictions';
import { RESTAURANT_PLANS, ZONE_PLANS } from '../../subscription/constants/plans';
import { safeToastSuccess, safeToastError } from '../../../shared/utils/toastUtils';

const MenuCategories = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories = [], items = [], categoriesLoading: loading, categoriesError: error } = useSelector(state => state.menu);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeItems = Array.isArray(items) ? items : [];

  // Count menu items per category so we can show usage and gate deletion
  // (the backend rejects deletion of any category that still has items).
  const itemCountByCategory = safeItems.reduce((acc, item) => {
    const catId = item.categoryId?.toString?.() || item.categoryId;
    if (!catId) return acc;
    acc[catId] = (acc[catId] || 0) + 1;
    return acc;
  }, {});
  const getItemCount = (cat) => itemCountByCategory[(cat?.id || cat?._id)?.toString?.()] || itemCountByCategory[cat?.id || cat?._id] || 0;

  // Sort categories by sortOrder
  const sortedCategories = [...safeCategories].sort((a, b) => 
    (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  const {
    subscription,
    subscriptionLimits,
    currentCounts,
    checkLimit,
    loading: subscriptionLoading,
    PlanStatusBadge,
    FeatureRestriction,
    LimitReachedModal
  } = usePlanRestrictions();

  const getCategoriesLimit = () => {
    if (subscription?.maxCategories && subscription.maxCategories !== -1) return subscription.maxCategories;
    if (subscriptionLimits?.maxCategories && subscriptionLimits.maxCategories !== -1) return subscriptionLimits.maxCategories;
    
    if (subscription?.key) {
      const planType = subscription.planType || 'restaurant';
      const planSource = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
      const planData = planSource[subscription.key];
      if (planData?.maxCategories && planData.maxCategories !== -1) return planData.maxCategories;
    }

    const isPremium = subscription?.key === 'premium' || subscription?.features?.unlimited || subscription?.plan === 'premium';
    if (isPremium) return '∞';
    return 8;
  };

  const categoriesLimit = getCategoriesLimit();
  // Count ALL categories (active + hidden) to match backend validation
  const totalCategories = safeCategories.length;
  const activeCategories = safeCategories.filter(c => c.isActive !== false);
  const categoryLimitReached = categoriesLimit !== '∞' && totalCategories >= parseInt(categoriesLimit);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    sortOrder: 0
  });

  const [deleteModal, setDeleteModal] = useState({ show: false, categoryId: null, categoryName: '' });

  useEffect(() => {
    if (restaurantId) {
      dispatch(hydrateMenuData({ entityId: restaurantId, entityType: 'restaurant', isDashboard: true }));
    }
  }, [dispatch, restaurantId]);

  const handleAddCategory = () => {
    const canAdd = checkLimit('categories');
    if (!canAdd) return;

    setEditingCategory(null);
    setFormData({ name: '', description: '', isActive: true, sortOrder: categories.length + 1 });
    setShowModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      sortOrder: category.sortOrder
    });
    setShowModal(true);
  };



  const handleSaveCategory = async () => {
    try {
      setImageUploading(true);

      let categoryData = {
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder
      };

      let result;
      if (editingCategory) {
        result = await dispatch(updateCategory({ entityId: restaurantId, entityType: 'restaurant', categoryId: editingCategory.id, categoryData }));
      } else {
        result = await dispatch(createCategory({ entityId: restaurantId, entityType: 'restaurant', categoryData }));
      }

      if (result.type.endsWith('/fulfilled')) {
        safeToastSuccess(editingCategory ? 'Category updated successfully' : 'Category created successfully');
        setFormData({ name: '', description: '', isActive: true, sortOrder: 0 });
        setShowModal(false);
      } else {
        safeToastError(result.payload || 'Failed to save category');
      }
    } catch (error) {
      safeToastError(`Failed to save category: ${error.message}`);
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteCategory = (categoryId, categoryName) => {
    setDeleteModal({ show: true, categoryId, categoryName });
  };

  const confirmDelete = async () => {
    try {
      const result = await dispatch(deleteCategory({ entityId: restaurantId, entityType: 'restaurant', categoryId: deleteModal.categoryId }));
      if (result.type.endsWith('/fulfilled')) {
        safeToastSuccess('Category deleted successfully');
      } else {
        safeToastError(result.payload || 'Failed to delete category');
      }
    } catch (error) {
      safeToastError(`Failed to delete category: ${error.message}`);
    }
    setDeleteModal({ show: false, categoryId: null, categoryName: '' });
  };

  const handleToggleClick = async (category) => {
    try {
      const newIsActive = !category.isActive;
      const categoryData = {
        name: category.name,
        description: category.description || '',
        sortOrder: category.sortOrder || 0,
        isActive: newIsActive
      };

      const result = await dispatch(updateCategory({
        entityId: restaurantId,
        entityType: 'restaurant',
        categoryId: category.id,
        categoryData
      }));

      if (result.type.endsWith('/fulfilled')) {
        safeToastSuccess(`Category ${newIsActive ? 'shown' : 'hidden'} successfully`);
        // Force refetch so the owner dashboard always reflects the actual DB state
        dispatch(fetchMenuCategories({ entityId: restaurantId, entityType: 'restaurant', isDashboard: true }));
      } else {
        safeToastError(result.payload || 'Failed to update category');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      safeToastError(`Failed to update category: ${error.message}`);
    }
  };

  return (
    <SingleRestaurantLayout>
      <div className="w-full h-full flex flex-col gap-6 pb-12">
        
        {/* Header Section */}
        <div className="admin-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight">Menu Category</h1>
              {subscription && subscription.key !== 'premium' && (
                <span className="bg-theme-bg-tertiary text-theme-text-secondary px-2.5 py-1 rounded-md text-xs font-bold border border-theme-border-primary">
                  {totalCategories} / {categoriesLimit} ({activeCategories.length} Active)
                </span>
              )}
            </div>
            <p className="text-sm text-theme-text-secondary">Organize and structure your catalog for customer ordering.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <FeatureRestriction
              feature="crudMenu"
              subscription={subscription}
              fallback={
                <button
                  onClick={() => restaurantId && navigate(`/restaurant/${restaurantId}/upgrade`)}
                  className="px-5 py-2.5 bg-theme-bg-tertiary text-theme-text-tertiary rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border border-theme-border-primary hover:bg-theme-bg-hover transition-colors"
                >
                  <FaPlus /> Upgrade to Add
                </button>
              }
            >
              <button
                onClick={categoryLimitReached ? undefined : handleAddCategory}
                disabled={categoryLimitReached}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm ${
                  categoryLimitReached 
                    ? 'bg-theme-bg-tertiary text-theme-text-tertiary border border-theme-border-primary cursor-not-allowed' 
                    : 'btn-primary'
                }`}
              >
                <FaPlus /> {categoryLimitReached ? 'Limit Reached' : 'New Category'}
              </button>
            </FeatureRestriction>
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {error && (
          <div className="bg-status-error-light text-status-error p-4 rounded-xl border border-status-error text-sm font-medium">
            Error loading categories: {error}
          </div>
        )}

        {/* Categories List */}
        {!error && sortedCategories.length > 0 && (
          <div className="space-y-3">
            {sortedCategories.map((category) => {
              const itemCount = getItemCount(category);
              const hasItems = itemCount > 0;
              return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`admin-card rounded-xl flex items-center p-5 transition-all hover:shadow-md ${
                  !category.isActive ? 'border-status-warning opacity-80' : ''
                }`}
              >
                {/* Category Info */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-bold text-theme-text-primary truncate">{category.name}</h3>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      category.isActive
                        ? 'bg-status-success text-white'
                        : 'bg-status-warning text-white'
                    }`}>
                      {category.isActive ? 'Visible' : 'Hidden'}
                    </span>
                    <span
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-theme-bg-tertiary text-theme-text-secondary border border-theme-border-primary"
                      title={hasItems ? `${itemCount} menu item${itemCount === 1 ? '' : 's'} in this category` : 'No menu items in this category'}
                    >
                      {itemCount} item{itemCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-sm text-theme-text-secondary line-clamp-1">
                    {category.description || 'No description provided.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggleClick(category)}
                    className="relative"
                    title={category.isActive ? 'Hide category' : 'Show category'}
                  >
                    <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${category.isActive ? 'bg-status-success' : 'bg-theme-bg-tertiary shadow-inner ring-1 ring-theme-border-primary'}`}>
                      <div className={`w-5 h-5 rounded-full transform transition-transform duration-200 ease-in-out shadow-md ${category.isActive ? 'bg-white translate-x-5' : 'bg-white translate-x-0 shadow-[0_1px_3px_rgba(0,0,0,0.3)]'}`} />
                    </div>
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-bg-tertiary text-theme-text-secondary hover:bg-accent hover:text-white rounded-lg text-xs font-bold transition-colors border border-theme-border-primary hover:border-accent"
                  >
                    <FaEdit /> Edit
                  </button>

                  {/* Delete Button — disabled while the category still has menu items
                      (backend also rejects with 400, but we gate it client-side so the
                      user can't even attempt it and gets a clear tooltip explaining why). */}
                  <button
                    onClick={() => !hasItems && handleDeleteCategory(category.id, category.name)}
                    disabled={hasItems}
                    title={hasItems ? `Remove all ${itemCount} item${itemCount === 1 ? '' : 's'} first before deleting this category` : 'Delete category'}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${
                      hasItems
                        ? 'bg-theme-bg-tertiary text-theme-text-tertiary border-theme-border-primary cursor-not-allowed opacity-60'
                        : 'bg-theme-bg-tertiary text-theme-text-secondary hover:bg-status-error hover:text-white border-theme-border-primary hover:border-status-error'
                    }`}
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </motion.div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedCategories.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center admin-card rounded-2xl border-dashed py-20 px-4 text-center">
            <div className="w-16 h-16 bg-theme-bg-tertiary rounded-full flex items-center justify-center mb-4">
              <FaList className="text-2xl text-theme-text-tertiary" />
            </div>
            <h3 className="text-lg font-bold text-theme-text-primary mb-1">No Categories Configured</h3>
            <p className="text-sm text-theme-text-secondary mb-6">Build your menu structure by adding your first category.</p>
            
            <FeatureRestriction
              feature="crudMenu"
              subscription={subscription}
              fallback={
                <button onClick={() => navigate(`/restaurant/${restaurantId}/upgrade`)} className="px-5 py-2.5 bg-theme-bg-tertiary text-theme-text-tertiary rounded-lg text-sm font-semibold border border-theme-border-primary hover:bg-theme-bg-hover transition-colors">
                  Upgrade to Build Menu
                </button>
              }
            >
              <button
                onClick={categoryLimitReached ? undefined : handleAddCategory}
                disabled={categoryLimitReached}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                  categoryLimitReached 
                    ? 'bg-theme-bg-tertiary text-theme-text-tertiary border border-theme-border-primary cursor-not-allowed' 
                    : 'btn-primary'
                }`}
              >
                {categoryLimitReached ? 'Limit Reached' : 'Initialize First Category'}
              </button>
            </FeatureRestriction>
          </div>
        )}

        {/* Modal: Add / Edit Category */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="admin-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border-primary bg-theme-bg-secondary">
                  <h2 className="font-bold text-theme-text-primary">
                    {editingCategory ? 'Modify Category' : 'New Category'}
                  </h2>
                  <button onClick={() => setShowModal(false)} disabled={imageUploading} className="text-theme-text-tertiary hover:text-theme-text-primary disabled:opacity-50 transition-colors">
                    <FaTimes />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-theme-text-secondary uppercase tracking-wider mb-2">Category Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Appetizers, Signature Mains"
                      className="input-theme w-full px-4 py-2.5 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-theme-text-secondary uppercase tracking-wider mb-2">Description <span className="text-theme-text-tertiary font-normal normal-case">(Optional)</span></label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief context for this section..."
                      rows="3"
                      className="input-theme w-full px-4 py-2.5 rounded-lg text-sm resize-none"
                    />
                  </div>



                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="w-10 h-5 bg-theme-bg-tertiary ring-1 ring-inset ring-theme-text-tertiary/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:shadow-md after:transition-all peer-checked:bg-accent peer-checked:ring-0"></div>
                      </div>
                      <span className="text-sm font-medium text-theme-text-primary select-none">
                        {formData.isActive ? 'Visible to Customers' : 'Hidden from Customers'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-theme-border-primary bg-theme-bg-secondary flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={imageUploading}
                    className="btn-secondary flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    disabled={imageUploading || !formData.name.trim()}
                    className="btn-primary flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {imageUploading ? <FaSpinner className="animate-spin" /> : null}
                    {imageUploading ? 'Saving...' : 'Commit Changes'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Confirmation */}
        <AnimatePresence>
          {deleteModal.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="admin-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
              >
                <div className="w-16 h-16 bg-status-error-light rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-status-error/30">
                  <FaTrash className="text-2xl text-status-error" />
                </div>
                <h3 className="text-xl font-bold text-theme-text-primary mb-2">Destructive Action</h3>
                <p className="text-sm text-theme-text-secondary mb-6">
                  Are you absolutely sure you want to delete <span className="font-bold text-theme-text-primary">"{deleteModal.categoryName}"</span>? This will permanently remove the category and detach any assigned items.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ show: false, categoryId: null, categoryName: '' })}
                    className="btn-secondary flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Abort
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-status-error text-white rounded-lg text-sm font-semibold hover:bg-status-error/80 transition-colors shadow-sm border border-status-error"
                  >
                    Confirm Deletion
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {LimitReachedModal}
      </div>
    </SingleRestaurantLayout>
  );
};

export default MenuCategories;
