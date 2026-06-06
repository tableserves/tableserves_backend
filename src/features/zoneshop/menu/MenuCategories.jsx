import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaFolderOpen,
  FaExclamationCircle
} from 'react-icons/fa';
import ZoneShopLayout from '../pages/ZoneShopLayout';
import { useDispatch, useSelector } from 'react-redux';
import { usePlanRestrictions } from '../../../features/subscription/components/PlanRestrictions';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  fetchMenuCategories,
  fetchMenuItems
} from '../../../store/slices/menuSlice';
import { safeToastSuccess, safeToastError } from '../../../shared/utils/toastUtils';

const MenuCategories = () => {
  const { zoneId, shopId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories = [], items = [], categoriesLoading: loading, categoriesError: error } = useSelector(state => state.menu);
  const { user } = useSelector(state => state.ui.auth);

  const getCategoryId = (category) => category?.id || category?._id;

  // Count menu items per category so we can show usage and gate deletion
  // (the backend rejects deletion of any category that still has items).
  const safeItems = Array.isArray(items) ? items : [];
  const itemCountByCategory = safeItems.reduce((acc, item) => {
    const catId = item.categoryId?.toString?.() || item.categoryId;
    if (!catId) return acc;
    acc[catId] = (acc[catId] || 0) + 1;
    return acc;
  }, {});
  const getItemCount = (cat) => {
    const id = getCategoryId(cat);
    return itemCountByCategory[id?.toString?.()] || itemCountByCategory[id] || 0;
  };

  // Plan restrictions integration
  const {
    subscription,
    subscriptionLimits,
    currentCounts,
    checkLimit,
    PlanStatusBadge,
    FeatureRestriction,
    LimitReachedModal
  } = usePlanRestrictions();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    displayOrder: '1',
    active: true,
    color: '#FF6B35'
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, categoryId: null, categoryName: '' });
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (shopId) {
      dispatch(fetchMenuCategories({ entityId: shopId, entityType: 'shop' }));
      // Also fetch items so we can show the per-category item count and gate
      // the delete button (categories with items can't be deleted).
      dispatch(fetchMenuItems({ entityId: shopId, entityType: 'shop', limit: 1000 }));
    }
  }, [dispatch, shopId]);

  const sortedCategories = [...categories].sort((a, b) => 
    (a.sortOrder || a.displayOrder) - (b.sortOrder || b.displayOrder)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // If creating a new category (not editing), check the limit first
      if (!editingCategory) {
        const currentLimit = getCategoriesLimit();
        const currentCount = categories.length;
        
        console.log('Pre-submit limit check:', {
          currentLimit,
          currentCount,
          wouldExceed: currentLimit !== '∞' && currentCount >= parseInt(currentLimit)
        });
        
        if (currentLimit !== '∞' && currentCount >= parseInt(currentLimit)) {
          console.error('Category limit reached, cannot create new category');
          safeToastError(`Category limit reached! Your plan allows ${currentLimit} categories. Please upgrade your plan to add more categories.`);
          return;
        }
      }

      const categoryData = {
        name: String(formData.name).trim(),
        description: String(formData.description || '').trim(),
        sortOrder: Number(formData.displayOrder) || 0,
        isActive: Boolean(formData.active),
        image: formData.image ? String(formData.image).trim() : null,
        settings: {
          showInMenu: Boolean(formData.active),
          allowCustomization: true
        },
        tags: Array.isArray(formData.tags) ? formData.tags : []
      };

      let result;
      if (editingCategory) {
        const categoryId = getCategoryId(editingCategory);
        if (!categoryId) {
          safeToastError('Missing category id. Please refresh and try again.');
          return;
        }
        result = await dispatch(updateCategory({
          entityId: shopId,
          entityType: 'shop',
          categoryId,
          categoryData
        }));
      } else {
        result = await dispatch(createCategory({
          entityId: shopId,
          entityType: 'shop',
          categoryData
        }));
      }

      if (result.type.endsWith('/fulfilled')) {
        safeToastSuccess(editingCategory ? 'Category updated successfully' : 'Category created successfully');
        resetForm();
      } else {
        console.error('Operation failed:', result.payload);
        const errorMessage = result.payload || 'Failed to save category';
        safeToastError(errorMessage);
      }
    } catch (error) {
      console.error('Submit error:', error);
      safeToastError(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: '',
      displayOrder: (categories.length + 1).toString(),
      active: true,
      color: '#FF6B35'
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category) => {
    if (!category) return;
    setFormData({
      name: category.name || '',
      description: category.description || '',
      image: category.image || '',
      displayOrder: String(category.sortOrder || category.displayOrder || 1),
      active: category.isActive !== undefined ? category.isActive : (category.active !== undefined ? category.active : true),
      color: category.color || '#FF6B35'
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleToggleClick = async (category) => {
    try {
      const categoryId = getCategoryId(category);
      if (!categoryId) {
        console.error('Toggle failed: missing category id', category);
        safeToastError('Missing category id. Please refresh and try again.');
        return;
      }

      const currentState = category.isActive !== undefined ? category.isActive : category.active;
      const newIsActive = !currentState;
      const categoryData = {
        name: String(category.name).trim(),
        description: String(category.description || '').trim(),
        sortOrder: Number(category.sortOrder || category.displayOrder) || 0,
        isActive: newIsActive,
        image: category.image ? String(category.image).trim() : null,
        settings: {
          showInMenu: newIsActive,
          allowCustomization: true
        },
        tags: Array.isArray(category.tags) ? category.tags : []
      };

      const result = await dispatch(updateCategory({
        entityId: shopId,
        entityType: 'shop',
        categoryId,
        categoryData
      }));

      if (result.type.endsWith('/fulfilled')) {
        safeToastSuccess(`Category ${newIsActive ? 'shown' : 'hidden'} successfully`);
        // Force refetch so the dashboard always reflects the actual DB state
        dispatch(fetchMenuCategories({ entityId: shopId, entityType: 'shop' }));
      } else {
        safeToastError(result.payload || 'Failed to update category');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      safeToastError(`Failed to update category: ${error.message}`);
    }
  };

  const handleAddCategory = () => {
    // Check if limit is reached before allowing to add
    if (categoryLimitReached) {
      console.log('Category limit reached, blocking add');
      return; // Don't open the form if limit is reached
    }
    
    // Double-check with the checkLimit function
    const canAdd = checkLimit('categories');
    
    if (!canAdd) {
      console.log('checkLimit returned false, blocking add');
      return;
    }
    
    resetForm();
    setShowForm(true);
  };

  const getCategoriesLimit = () => {
    // Check if premium/unlimited plan
    const isPremium = subscription?.key === 'premium' || 
                      subscription?.plan === 'premium' ||
                      subscription?.key === 'zone_premium' || 
                      subscription?.features?.unlimited;
    if (isPremium) return '∞';
    
    // Check for maxCategories in various possible locations
    const maxCategories = subscription?.maxCategories || 
                          subscription?.limits?.maxCategories || 
                          subscriptionLimits?.maxCategories;
    
    // If we have a valid limit, use it
    if (maxCategories && maxCategories !== -1) {
      return maxCategories;
    }
    
    // Default fallback (should not reach here if subscription is loaded)
    return 8;
  };

  const categoriesLimit = getCategoriesLimit();
  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => {
    const isActive = c.isActive !== undefined ? c.isActive : c.active;
    return isActive !== false;
  });
  const categoryLimitReached = categoriesLimit !== '∞' && totalCategories >= parseInt(categoriesLimit);

  const handleDeleteCategory = (categoryId, categoryName) => {
    setDeleteModal({ show: true, categoryId, categoryName });
  };

  const confirmDelete = async () => {
    try {
      const result = await dispatch(deleteCategory({
        entityId: shopId,
        entityType: 'shop',
        categoryId: deleteModal.categoryId
      }));
      if (result.type.endsWith('/fulfilled')) {
        safeToastSuccess('Category deleted successfully');
      } else {
        safeToastError(result.payload || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Delete error:', error);
      safeToastError(`Failed to delete category: ${error.message}`);
    }
    setDeleteModal({ show: false, categoryId: null, categoryName: '' });
  };

  return (
    <ZoneShopLayout>
      <div className="w-full h-full flex flex-col gap-6 pb-12">
        
        {/* Header Section */}
        <div className="admin-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight">Menu Category</h1>
              {subscription && subscription.key !== 'premium' && subscription.key !== 'zone_premium' && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                  categoryLimitReached 
                    ? 'bg-status-error-light text-status-error border-status-error' 
                    : 'bg-theme-bg-tertiary text-theme-text-secondary border-theme-border-primary'
                }`}>
                  {totalCategories} / {categoriesLimit} ({activeCategories.length} Active)
                </span>
              )}
            </div>
            <p className="text-sm text-theme-text-secondary">
              Organize and structure your catalog for customer ordering.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <FeatureRestriction
              feature="crudMenu"
              subscription={subscription}
              fallback={
                <button
                  onClick={() => zoneId && shopId && navigate(`/zone/${zoneId}/shop/${shopId}/upgrade`)}
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
                title={categoryLimitReached ? `You've reached your plan limit of ${categoriesLimit} categories` : 'Add a new category'}
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

        {/* Categories List (Updated UI) */}
        {!error && sortedCategories.length > 0 && (
          <div className="flex flex-col gap-3">
            {sortedCategories.map((category) => {
              const isActive = category.isActive !== undefined ? category.isActive : category.active;
              const categoryId = getCategoryId(category);
              const itemCount = getItemCount(category);
              const hasItems = itemCount > 0;

              return (
                <motion.div
                  key={categoryId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`admin-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4 bg-theme-bg-primary ${
                    !isActive ? 'border-status-warning opacity-80' : 'border-theme-border-primary'
                  }`}
                >
                  {/* Left Side: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-bold text-theme-text-primary truncate">{category.name}</h3>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        isActive
                          ? 'bg-status-success/10 text-status-success border-status-success/20'
                          : 'bg-status-warning/10 text-status-warning border-status-warning/20'
                      }`}>
                        {isActive ? 'Visible' : 'Hidden'}
                      </span>
                      <span
                        className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-theme-bg-tertiary text-theme-text-secondary border-theme-border-primary"
                        title={hasItems ? `${itemCount} menu item${itemCount === 1 ? '' : 's'} in this category` : 'No menu items in this category'}
                      >
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-theme-text-secondary text-xs font-raleway truncate max-w-sm lg:max-w-xl">
                        {category.description}
                      </p>
                    )}
                  </div>

                  {/* Right Side: Toggles & Actions */}
                  <div className="flex items-center justify-between w-full md:w-auto gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-theme-border/50 shrink-0">
                    
                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-theme-text-secondary md:hidden">Status:</span>
                      <button 
                        onClick={() => handleToggleClick(category)}
                        className="relative"
                        title={isActive ? "Hide Category" : "Show Category"}
                      >
                        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${isActive ? 'bg-status-success' : 'bg-theme-bg-tertiary shadow-inner ring-1 ring-theme-border-primary'}`}>
                          <div className={`w-4 h-4 rounded-full transform transition-transform duration-200 ease-in-out ${isActive ? 'bg-white shadow-md translate-x-4' : 'bg-white translate-x-0 shadow-[0_1px_3px_rgba(0,0,0,0.3)]'}`} />
                        </div>
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="px-3 py-1.5 bg-theme-bg-secondary border border-theme-border text-theme-text-secondary hover:text-theme-accent-primary hover:border-theme-accent-primary hover:bg-theme-accent-primary/5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => !hasItems && handleDeleteCategory(categoryId, category.name)}
                        disabled={hasItems}
                        title={hasItems ? `Remove all ${itemCount} item${itemCount === 1 ? '' : 's'} first before deleting this category` : 'Delete Category'}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0 border ${
                          hasItems
                            ? 'bg-theme-bg-tertiary border-theme-border-primary text-theme-text-tertiary cursor-not-allowed opacity-60'
                            : 'bg-status-error-light border-status-error/20 text-status-error hover:bg-status-error hover:text-white'
                        }`}
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
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
              <FaFolderOpen className="text-2xl text-theme-text-tertiary" />
            </div>
            <h3 className="text-lg font-bold text-theme-text-primary mb-1">No Categories Configured</h3>
            <p className="text-sm text-theme-text-secondary mb-6">Build your menu structure by adding your first category.</p>

            <FeatureRestriction
              feature="crudMenu"
              subscription={subscription}
              fallback={
                <button
                  onClick={() => zoneId && shopId && navigate(`/zone/${zoneId}/shop/${shopId}/upgrade`)}
                  className="px-5 py-2.5 bg-theme-bg-tertiary text-theme-text-tertiary rounded-lg text-sm font-semibold border border-theme-border-primary hover:bg-theme-bg-hover transition-colors"
                >
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
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              onClick={() => !imageUploading && setShowForm(false)}
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
                  <button onClick={() => setShowForm(false)} disabled={imageUploading} className="text-theme-text-tertiary hover:text-theme-text-primary disabled:opacity-50 transition-colors">
                    <FaTimes />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form id="categoryForm" onSubmit={handleSubmit} className="space-y-5">
                    
                    <div>
                      <label className="block text-xs font-bold text-theme-text-secondary uppercase tracking-wider mb-2">Category Name <span className="text-status-error">*</span></label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="input-theme w-full px-4 py-2.5 rounded-lg text-sm"
                        placeholder="e.g., Appetizers, Signature Mains"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-theme-text-secondary uppercase tracking-wider mb-2">Description <span className="text-theme-text-tertiary font-normal normal-case">(Optional)</span></label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="input-theme w-full px-4 py-2.5 rounded-lg text-sm resize-none"
                        placeholder="Brief context for this section..."
                        rows="3"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-theme-text-secondary uppercase tracking-wider mb-2">Display Order <span className="text-status-error">*</span></label>
                        <input
                          type="number"
                          value={formData.displayOrder}
                          onChange={(e) => setFormData({...formData, displayOrder: e.target.value})}
                          className="input-theme w-full px-4 py-2.5 rounded-lg text-sm"
                          min="1"
                          required
                        />
                      </div>
                      
                      <div className="flex flex-col justify-center pt-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.active}
                              onChange={(e) => setFormData({...formData, active: e.target.checked})}
                              className="peer sr-only"
                            />
                            <div className="w-10 h-5 bg-theme-bg-tertiary ring-1 ring-inset ring-theme-text-tertiary/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:shadow-md after:transition-all peer-checked:bg-accent peer-checked:ring-0"></div>
                          </div>
                          <span className="text-sm font-medium text-theme-text-primary select-none">
                            {formData.active ? 'Visible to Customers' : 'Hidden from Customers'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="px-6 py-4 border-t border-theme-border-primary bg-theme-bg-secondary flex gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    disabled={imageUploading}
                    className="btn-secondary flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="categoryForm"
                    disabled={imageUploading || !formData.name.trim()}
                    className="btn-primary flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
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

        {/* Plan Restriction Modals */}
        {LimitReachedModal}
      </div>
    </ZoneShopLayout>
  );
};

export default MenuCategories;