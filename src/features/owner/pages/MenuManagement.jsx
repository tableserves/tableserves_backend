import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSave,
  FaTimes,
  FaImage,
  FaSpinner,
  FaUtensils,
  FaFilter,
  FaChevronDown,
  FaStar,
  FaRulerCombined,
  FaCog
} from 'react-icons/fa';
import SingleRestaurantLayout from '../components/SingleRestaurantLayout';
import ImageUpload from '../../../components/common/ImageUpload';
import {
  fetchMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  fetchMenuCategories,
  createVariant,
  createModifier,
  updateVariant as updateVariantThunk,
  deleteVariant,
  updateModifier as updateModifierThunk,
  deleteModifier,
  fetchMenuVariants,
  fetchMenuModifiers
} from '../../../store/slices/menuSlice';
import { usePlanRestrictions } from '../../subscription/components/PlanRestrictions';
import { RESTAURANT_PLANS, ZONE_PLANS } from '../../subscription/constants/plans';
import { safeToastSuccess, safeToastError } from '../../../shared/utils/toastUtils';
import ImageUploadService from '../../../services/ImageUploadService';

const MenuManagement = () => {
  const { restaurantId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const getItemId = (item) => item?.id || item?._id;
  
  const menuItemsState = useSelector((state) => state.menu);
  const menuItems = Array.isArray(menuItemsState.items) ? menuItemsState.items : [];
  const menuItemsLoading = menuItemsState.itemsLoading;
  const menuItemsError = menuItemsState.itemsError;
  const { categories: availableCategories = [], categoriesLoading } = useSelector((state) => state.menu);
  
  // Get variants and modifiers from Redux state
  const allVariants = useSelector((state) => state.menu.variants || []);
  const allModifiers = useSelector((state) => state.menu.modifiers || []);

  const {
    subscription,
    subscriptionLimits,
    currentCounts,
    checkLimit,
    loading: subscriptionLoading,
    PlanStatusBadge,
    FeatureRestriction,
    LimitReachedModal,
    PaymentModal,
    PaymentSuccessModal
  } = usePlanRestrictions();

  // Limit Calculations
  const getLimit = (type) => {
    const key = type === 'items' ? 'maxMenuItems' : 'maxCategories';
    if (subscription?.[key] && subscription[key] !== -1) return subscription[key];
    if (subscriptionLimits?.[key] && subscriptionLimits[key] !== -1) return subscriptionLimits[key];
    
    if (subscription?.key) {
      const planType = subscription.planType || 'restaurant';
      const planSource = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
      const planData = planSource[subscription.key];
      if (planData?.[key] && planData[key] !== -1) return planData[key];
    }

    const isPremium = subscription?.key === 'premium' || subscription?.features?.unlimited || subscription?.plan === 'premium';
    if (isPremium) return '∞';
    return type === 'items' ? 80 : 8;
  };

  const menuItemLimit = getLimit('items');
  const categoriesLimit = getLimit('categories');

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, itemId: null, itemName: '' });
  const [expandedCategories, setExpandedCategories] = useState({}); // Track which categories are expanded
  const [lockedCategory, setLockedCategory] = useState(null); // Track if category is locked in form
  
  // NEW: Collapsible sections
  const [showVariants, setShowVariants] = useState(false);
  const [showModifiers, setShowModifiers] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isVeg: false,
    isSpicy: false,
    image: '',
    available: true,
    // NEW: Inline variants and modifiers
    variants: [],
    modifiers: []
  });

  useEffect(() => {
    if (restaurantId) {
      dispatch(fetchMenuCategories({ entityId: restaurantId, entityType: 'restaurant', limit: 1000, isDashboard: true }));
      dispatch(fetchMenuItems({ entityId: restaurantId, entityType: 'restaurant', limit: 1000, isDashboard: true }));
      dispatch(fetchMenuVariants({ entityId: restaurantId, entityType: 'restaurant', limit: 1000 }));
      dispatch(fetchMenuModifiers({ entityId: restaurantId, entityType: 'restaurant', limit: 1000 }));
    }
  }, [restaurantId, dispatch]);

  const loading = menuItemsLoading || categoriesLoading;
  const error = menuItemsError;

  // Function to get variants for a specific menu item
  const getItemVariants = (itemId) => {
    return allVariants.filter(variant => 
      variant.menuItems && Array.isArray(variant.menuItems) && 
      variant.menuItems.some(id => id === itemId || id.toString() === itemId.toString())
    );
  };

  // Function to get modifiers for a specific menu item
  const getItemModifiers = (itemId) => {
    return allModifiers.filter(modifier => 
      modifier.menuItems && Array.isArray(modifier.menuItems) && 
      modifier.menuItems.some(id => id === itemId || id.toString() === itemId.toString())
    );
  };

  // Enrich menu items with their variants and modifiers
  const enrichedMenuItems = menuItems.map(item => ({
    ...item,
    variants: getItemVariants(item.id || item._id),
    modifiers: getItemModifiers(item.id || item._id)
  }));

  // Calculate limit after enrichedMenuItems is defined
  // NOTE: Limit is PER CATEGORY, not global
  const getItemsInCategory = (catId) => {
    if (!catId) return enrichedMenuItems.length;
    return enrichedMenuItems.filter(item => item.categoryId === catId).length;
  };
  
  // Check if limit is reached for a specific category
  const isCategoryLimitReached = (catId) => {
    if (!catId || menuItemLimit === '∞') return false;
    return getItemsInCategory(catId) >= parseInt(menuItemLimit);
  };
  
  // Global limit check (for display purposes only)
  const isItemLimitReached = menuItemLimit !== '∞' && enrichedMenuItems.length >= parseInt(menuItemLimit);

  // ===== VARIANT HELPER FUNCTIONS =====
  const addVariant = () => {
    setFormData(prev => {
      // Use current product price as default option price
      const currentPrice = prev.price || '';
      
      return {
        ...prev,
        variants: [...(prev.variants || []), {
          name: '',
          type: 'single',
          required: true,
          options: [{ name: '', price: currentPrice, isDefault: true }]
        }]
      };
    });
    setShowVariants(true);
  };

  const removeVariant = (index) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== index)
    }));
  };

  const updateVariant = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const addVariantOption = (variantIndex) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((v, i) => 
        i === variantIndex 
          ? { ...v, options: [...(v.options || []), { name: '', price: '', isDefault: false }] }
          : v
      )
    }));
  };

  const removeVariantOption = (variantIndex, optionIndex) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((v, i) => 
        i === variantIndex 
          ? { ...v, options: (v.options || []).filter((_, oi) => oi !== optionIndex) }
          : v
      )
    }));
  };

  const updateVariantOption = (variantIndex, optionIndex, field, value) => {
    setFormData(prev => {
      const updatedVariants = (prev.variants || []).map((v, i) => 
        i === variantIndex 
          ? {
              ...v,
              options: (v.options || []).map((o, oi) => 
                oi === optionIndex ? { ...o, [field]: value } : o
              )
            }
          : v
      );
      
      // If updating price of the default option, update product price too
      const isDefaultOption = updatedVariants[variantIndex]?.options[optionIndex]?.isDefault;
      const shouldUpdateProductPrice = field === 'price' && isDefaultOption;
      
      return {
        ...prev,
        variants: updatedVariants,
        // Sync product price with default variant price
        price: shouldUpdateProductPrice ? value : prev.price
      };
    });
  };

  const toggleVariantDefault = (variantIndex, optionIndex) => {
    setFormData(prev => {
      const updatedVariants = (prev.variants || []).map((v, i) => 
        i === variantIndex 
          ? {
              ...v,
              options: (v.options || []).map((o, oi) => ({
                ...o,
                isDefault: oi === optionIndex
              }))
            }
          : v
      );
      
      // Get the new default option's price
      const defaultOption = updatedVariants[variantIndex]?.options[optionIndex];
      const defaultPrice = defaultOption?.price || prev.price;
      
      return {
        ...prev,
        variants: updatedVariants,
        // Update product price to match default variant price
        price: defaultPrice
      };
    });
  };

  // ===== MODIFIER HELPER FUNCTIONS =====
  const addModifier = () => {
    setFormData(prev => ({
      ...prev,
      modifiers: [...(prev.modifiers || []), {
        name: '',
        type: 'multiple',
        required: false,
        options: [{ name: '', price: 0 }]
      }]
    }));
    setShowModifiers(true);
  };

  const removeModifier = (index) => {
    setFormData(prev => ({
      ...prev,
      modifiers: (prev.modifiers || []).filter((_, i) => i !== index)
    }));
  };

  const updateModifier = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      modifiers: (prev.modifiers || []).map((m, i) => 
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  const addModifierOption = (modifierIndex) => {
    setFormData(prev => ({
      ...prev,
      modifiers: (prev.modifiers || []).map((m, i) => 
        i === modifierIndex 
          ? { ...m, options: [...(m.options || []), { name: '', price: 0 }] }
          : m
      )
    }));
  };

  const removeModifierOption = (modifierIndex, optionIndex) => {
    setFormData(prev => ({
      ...prev,
      modifiers: (prev.modifiers || []).map((m, i) => 
        i === modifierIndex 
          ? { ...m, options: (m.options || []).filter((_, oi) => oi !== optionIndex) }
          : m
      )
    }));
  };

  const updateModifierOption = (modifierIndex, optionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      modifiers: (prev.modifiers || []).map((m, i) => 
        i === modifierIndex 
          ? {
              ...m,
              options: (m.options || []).map((o, oi) => 
                oi === optionIndex ? { ...o, [field]: value } : o
              )
            }
          : m
      )
    }));
  };

  const ensureThunkSuccess = (actionResult, fallbackMessage) => {
    if (actionResult?.type?.endsWith('/fulfilled')) {
      return actionResult;
    }

    const errorMessage =
      (typeof actionResult?.payload === 'string' && actionResult.payload) ||
      actionResult?.error?.message ||
      fallbackMessage;

    throw new Error(errorMessage);
  };

  const buildVariantPayload = (variant, itemId) => {
    if (!variant?.name || !Array.isArray(variant.options) || variant.options.length === 0) {
      return null;
    }

    const validOptions = variant.options
      .filter((opt) => {
        // Only filter out options that don't have a name
        if (!opt?.name || opt.name.trim() === '') return false;
        return true;
      })
      .map((opt) => ({
        name: opt.name,
        price: opt.price === '' || opt.price === null || opt.price === undefined || Number.isNaN(parseFloat(opt.price))
          ? 0
          : parseFloat(opt.price),
        available: opt.available !== undefined ? opt.available : true,
        isDefault: opt.isDefault || false,
        // Preserve the _id if it exists (for existing options)
        ...(opt._id && { _id: opt._id }),
        ...(opt.id && { id: opt.id })
      }));

    if (validOptions.length === 0) {
      return null;
    }

    return {
      name: variant.name,
      type: variant.type || 'single',
      required: variant.required !== undefined ? variant.required : true,
      options: validOptions,
      minSelections: variant.minSelections || 1,
      maxSelections: variant.maxSelections || 1,
      menuItems: [itemId]
    };
  };

  const buildModifierPayload = (modifier, itemId) => {
    if (!modifier?.name || !Array.isArray(modifier.options) || modifier.options.length === 0) {
      return null;
    }

    const validOptions = modifier.options
      .filter((opt) => opt?.name && opt.name.trim() !== '')
      .map((opt) => ({
        name: opt.name,
        price: opt.price === '' || opt.price === null || opt.price === undefined || Number.isNaN(parseFloat(opt.price))
          ? 0
          : parseFloat(opt.price),
        available: opt.available !== undefined ? opt.available : true,
        // Preserve the _id if it exists (for existing options)
        ...(opt._id && { _id: opt._id }),
        ...(opt.id && { id: opt.id })
      }));

    if (validOptions.length === 0) {
      return null;
    }

    return {
      name: modifier.name,
      type: modifier.type || 'multiple',
      required: modifier.required !== undefined ? modifier.required : false,
      options: validOptions,
      minSelections: modifier.minSelections || 0,
      maxSelections: modifier.maxSelections || validOptions.length,
      menuItems: [itemId]
    };
  };

  const syncItemVariants = async (itemId, existingVariants = []) => {
    const submittedVariants = (formData.variants || []).map((variant) => ({
      ...variant,
      id: variant.id || variant._id
    }));
    const submittedVariantIds = new Set(
      submittedVariants.map((variant) => variant.id).filter(Boolean)
    );

    for (const variant of submittedVariants) {
      const variantPayload = buildVariantPayload(variant, itemId);
      if (!variantPayload) continue;

      if (variant.id) {
        const updateResult = await dispatch(updateVariantThunk({
          entityId: restaurantId,
          entityType: 'restaurant',
          variantId: variant.id,
          variantData: variantPayload
        }));
        ensureThunkSuccess(updateResult, 'Failed to update size options');
      } else {
        const createResult = await dispatch(createVariant({
          entityId: restaurantId,
          entityType: 'restaurant',
          variantData: variantPayload
        }));
        ensureThunkSuccess(createResult, 'Failed to create size options');
      }
    }

    for (const existingVariant of existingVariants) {
      const existingVariantId = existingVariant.id || existingVariant._id;
      if (!existingVariantId || submittedVariantIds.has(existingVariantId)) {
        continue;
      }

      const deleteResult = await dispatch(deleteVariant({
        entityId: restaurantId,
        entityType: 'restaurant',
        variantId: existingVariantId
      }));
      ensureThunkSuccess(deleteResult, 'Failed to remove deleted size options');
    }
  };

  const syncItemModifiers = async (itemId, existingModifiers = []) => {
    const submittedModifiers = (formData.modifiers || []).map((modifier) => ({
      ...modifier,
      id: modifier.id || modifier._id
    }));
    const submittedModifierIds = new Set(
      submittedModifiers.map((modifier) => modifier.id).filter(Boolean)
    );

    for (const modifier of submittedModifiers) {
      const modifierPayload = buildModifierPayload(modifier, itemId);
      if (!modifierPayload) continue;

      if (modifier.id) {
        const updateResult = await dispatch(updateModifierThunk({
          entityId: restaurantId,
          entityType: 'restaurant',
          modifierId: modifier.id,
          modifierData: modifierPayload
        }));
        ensureThunkSuccess(updateResult, 'Failed to update add-ons');
      } else {
        const createResult = await dispatch(createModifier({
          entityId: restaurantId,
          entityType: 'restaurant',
          modifierData: modifierPayload
        }));
        ensureThunkSuccess(createResult, 'Failed to create add-ons');
      }
    }

    for (const existingModifier of existingModifiers) {
      const existingModifierId = existingModifier.id || existingModifier._id;
      if (!existingModifierId || submittedModifierIds.has(existingModifierId)) {
        continue;
      }

      const deleteResult = await dispatch(deleteModifier({
        entityId: restaurantId,
        entityType: 'restaurant',
        modifierId: existingModifierId
      }));
      ensureThunkSuccess(deleteResult, 'Failed to remove deleted add-ons');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check per-category limit before submitting (only for new items)
    if (!editingItem && formData.categoryId) {
      if (isCategoryLimitReached(formData.categoryId)) {
        const currentCount = getItemsInCategory(formData.categoryId);
        safeToastError(`Category limit reached! This category already has ${currentCount} items. Your plan allows ${menuItemLimit} items per category.`);
        return;
      }
    }
    
    try {
      setImageUploading(true);
      let imageUrl = formData.image || null;

      if (selectedImageFile) {
        try {
          const uploadResult = await ImageUploadService.uploadMenuItemImage(selectedImageFile, 'restaurant', restaurantId);
          imageUrl = uploadResult.url;
        } catch (uploadError) {
          safeToastError(`Image upload failed: ${uploadError.message}`);
          setImageUploading(false);
          return; 
        }
      }

      const itemData = {
        name: formData.name,
        description: formData.description || '',
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        image: imageUrl,
        available: formData.available !== false,
        isVeg: formData.isVeg || false,
        isSpicy: formData.isSpicy || false
      };

      let result;
      if (editingItem) {
        result = await dispatch(updateMenuItem({ entityId: restaurantId, entityType: 'restaurant', itemId: editingItem.id, itemData }));
      } else {
        result = await dispatch(createMenuItem({ entityId: restaurantId, entityType: 'restaurant', categoryId: formData.categoryId, itemData }));
      }

      if (result.type.endsWith('/fulfilled')) {
        const itemId = editingItem?.id || result.payload?.data?.id || result.payload?.data?._id || result.payload?.id;

        if (itemId) {
          await syncItemVariants(itemId, editingItem?.variants || []);
          await syncItemModifiers(itemId, editingItem?.modifiers || []);
        }
        
        const hasExtras = (formData.variants && formData.variants.length > 0) || (formData.modifiers && formData.modifiers.length > 0);
        safeToastSuccess(
          editingItem 
            ? 'Item and customization options updated successfully'
            : hasExtras 
              ? 'Menu item created with all customization options!' 
              : 'Item created successfully'
        );
        resetForm();
      } else {
        safeToastError(result.payload || 'Failed to save menu item');
      }
    } catch (error) {
      safeToastError(`System error: ${error.message}`);
    } finally {
      setImageUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '', 
      price: '', 
      categoryId: '', 
      isVeg: false, 
      isSpicy: false, 
      image: '', 
      available: true,
      variants: [],
      modifiers: []
    });
    setSelectedImageFile(null);
    setEditingItem(null);
    setLockedCategory(null); // Clear locked category
    setShowModal(false);
    setShowVariants(false);
    setShowModifiers(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDelete = (itemId, itemName) => {
    if (!itemId) {
      safeToastError('Missing item id. Please refresh and try again.');
      return;
    }
    setDeleteModal({ show: true, itemId, itemName });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    
    // Load existing variants if they exist
    const existingVariants = item.variants && Array.isArray(item.variants) 
      ? item.variants.map(variant => ({
          id: variant.id || variant._id,
          name: variant.name || '',
          type: variant.type || 'single',
          required: variant.required !== undefined ? variant.required : true,
          options: variant.options && Array.isArray(variant.options)
            ? variant.options.map(opt => ({
                name: opt.name || '',
                price: opt.price !== undefined ? opt.price.toString() : '',
                isDefault: opt.isDefault || false
              }))
            : [{ name: '', price: '', isDefault: true }]
        }))
      : [];
    
    // Load existing modifiers if they exist
    const existingModifiers = item.modifiers && Array.isArray(item.modifiers)
      ? item.modifiers.map(modifier => ({
          id: modifier.id || modifier._id,
          name: modifier.name || '',
          type: modifier.type || 'multiple',
          required: modifier.required !== undefined ? modifier.required : false,
          options: modifier.options && Array.isArray(modifier.options)
            ? modifier.options.map(opt => ({
                name: opt.name || '',
                price: opt.price !== undefined ? opt.price : 0
              }))
            : [{ name: '', price: 0 }]
        }))
      : [];
    
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      categoryId: item.categoryId,
      isVeg: item.isVeg || false,
      isSpicy: item.isSpicy || false,
      image: item.image || '',
      available: item.available !== undefined ? item.available : true,
      variants: existingVariants,
      modifiers: existingModifiers
    });
    
    // Auto-expand sections if there are existing variants/modifiers
    if (existingVariants.length > 0) {
      setShowVariants(true);
    }
    if (existingModifiers.length > 0) {
      setShowModifiers(true);
    }
    
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      const result = await dispatch(deleteMenuItem({ entityId: restaurantId, entityType: 'restaurant', itemId: deleteModal.itemId }));
      if (result.type.endsWith('/fulfilled')) {
        safeToastSuccess('Item deleted successfully');
      } else {
        safeToastError(result.payload || 'Failed to delete item');
      }
    } catch (error) {
      safeToastError(`Failed to delete item: ${error.message}`);
    }
    setDeleteModal({ show: false, itemId: null, itemName: '' });
  };

  const handleToggleAvailability = async (item) => {
    try {
      const itemId = getItemId(item);
      if (!itemId) {
        safeToastError('Missing item id. Please refresh and try again.');
        return;
      }

      const currentAvailable = item?.available !== false;
      const itemData = {
        name: item.name,
        description: item.description || '',
        price: item.price,
        categoryId: item.categoryId,
        image: item.image || '',
        available: !currentAvailable,
        isVeg: item.isVeg || false,
        isSpicy: item.isSpicy || false
      };
      const result = await dispatch(updateMenuItem({ entityId: restaurantId, entityType: 'restaurant', itemId: itemId, itemData }));
      if (result.type.endsWith('/fulfilled')) {
        safeToastSuccess(`Item marked as ${!currentAvailable ? 'In Stock' : 'Out of Stock'}`);
      } else {
        safeToastError(result.payload || 'Failed to update availability');
      }
    } catch (error) {
      safeToastError(`Failed to update availability: ${error.message}`);
    }
  };

  const filteredItems = enrichedMenuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group items by category
  const groupedItems = availableCategories.map(category => ({
    category,
    items: filteredItems.filter(item => item.categoryId === category.id)
  })).filter(group => group.items.length > 0 || categoryFilter === 'all' || categoryFilter === group.category.id);

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Handle add item with pre-selected and LOCKED category
  // NOTE: Limit is PER CATEGORY (enforced both client-side here and server-side by checkMenuItemCreationLimit middleware).
  // Do NOT use checkLimit('menuItems') here — that counts globally across all categories and will incorrectly block
  // creation as soon as totalItems >= maxMenuItems, even if the target category still has space.
  const handleAddItemToCategory = (categoryId) => {
    if (isCategoryLimitReached(categoryId)) {
      const currentCount = getItemsInCategory(categoryId);
      safeToastError(`Category limit reached! This category already has ${currentCount} items. Your plan allows ${menuItemLimit} items per category.`);
      return;
    }

    resetForm();
    setFormData(prev => ({ ...prev, categoryId })); // Pre-select category
    setLockedCategory(categoryId); // Lock the category
    setShowModal(true);
  };

  return (
    <SingleRestaurantLayout>
      <div className="w-full h-full flex flex-col gap-6 pb-12">
        
        {/* Header & KPI Section */}
        <div className="admin-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight">Menu Catalog</h1>
            </div>
            <p className="text-sm text-theme-text-secondary">Manage individual dishes, pricing, and availability.</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="admin-card rounded-xl p-2 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary" />
            <input
              type="text"
              placeholder="Search items by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-transparent border-none focus:ring-0 text-sm text-theme-text-primary placeholder:text-theme-text-tertiary"
            />
          </div>
          <div className="w-px bg-theme-border-primary hidden sm:block my-2"></div>
          <div className="relative w-full sm:w-64 shrink-0 border-t border-theme-border-primary sm:border-none">
            <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary text-sm" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-11 pr-8 py-2.5 bg-transparent border-none focus:ring-0 text-sm font-medium text-theme-text-primary cursor-pointer appearance-none truncate"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data States */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {error && (
          <div className="bg-status-error-light text-status-error p-4 rounded-xl border border-status-error text-sm font-medium">
            Error loading catalog: {error}
          </div>
        )}

        {/* Grouped Items by Category */}
        {!loading && !error && (
          <div className="space-y-4">
            {groupedItems.length > 0 ? (
              groupedItems.map(({ category, items }) => {
                const isExpanded = expandedCategories[category.id];
                const itemCount = getItemsInCategory(category.id);
                const limitReached = isCategoryLimitReached(category.id);
                
                return (
                  <div key={category.id} className="admin-card rounded-xl shadow-sm overflow-hidden">
                    {/* Category Header */}
                    <div className="bg-theme-bg-secondary border-b border-theme-border-primary">
                      <div className="flex items-center justify-between p-4">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <FaChevronDown 
                            className={`text-theme-text-secondary transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-theme-text-primary">{category.name}</h3>
                            <p className="text-xs text-theme-text-secondary mt-0.5">
                              {itemCount} / {menuItemLimit === '∞' ? '∞' : menuItemLimit} items
                              {limitReached && <span className="text-status-error ml-2">• FULL</span>}
                            </p>
                          </div>
                        </button>
                        
                        <FeatureRestriction
                          feature="crudMenu"
                          subscription={subscription}
                          fallback={
                            <button 
                              onClick={() => navigate(`/restaurant/${restaurantId}/upgrade`)} 
                              className="px-4 py-2 bg-theme-bg-tertiary text-theme-text-tertiary rounded-lg text-xs font-semibold border border-theme-border-primary hover:bg-theme-bg-hover transition-colors flex items-center gap-2"
                            >
                              <FaPlus className="text-xs" /> Upgrade
                            </button>
                          }
                        >
                          <button
                            onClick={() => handleAddItemToCategory(category.id)}
                            disabled={limitReached}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                              limitReached 
                                ? 'bg-theme-bg-tertiary text-theme-text-tertiary border border-theme-border-primary cursor-not-allowed' 
                                : 'btn-primary'
                            }`}
                            title={limitReached ? `Category limit reached (${itemCount}/${menuItemLimit})` : 'Add item to this category'}
                          >
                            <FaPlus className="text-xs" /> {limitReached ? 'Full' : 'Add Item'}
                          </button>
                        </FeatureRestriction>
                      </div>
                    </div>

                    {/* Category Items */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {items.length > 0 ? (
                            <div className="divide-y divide-theme-border-primary">
                              {items.map((item) => (
                                <div 
                                  key={item.id} 
                                  className={`p-4 hover:bg-theme-bg-hover transition-colors flex items-center gap-4 ${!item.available ? 'opacity-70 bg-theme-bg-secondary' : ''}`}
                                >
                                  {/* Image */}
                                  <div className="w-16 h-16 rounded-lg border border-theme-border-primary overflow-hidden bg-theme-bg-secondary flex items-center justify-center shrink-0">
                                    {item.image ? (
                                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <FaUtensils className="text-theme-text-tertiary text-xl" />
                                    )}
                                  </div>

                                  {/* Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-bold text-theme-text-primary truncate">{item.name}</h4>
                                      {item.isVeg && <span className="w-2 h-2 rounded-full bg-status-success outline outline-1 outline-offset-1 outline-status-success/30" title="Vegetarian"></span>}
                                      {item.isSpicy && (
                                        <span
                                          className="inline-flex items-center justify-center text-status-error text-sm leading-none"
                                          title="Spicy"
                                          aria-label="Spicy"
                                        >
                                          🌶️
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-theme-text-secondary truncate mb-2">{item.description || 'No description'}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-bold text-theme-text-primary">₹{item.price.toFixed(2)}</span>
                                      {item.variants && item.variants.length > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-bold border border-accent/30">
                                          <FaRulerCombined className="text-[8px]" />
                                          {item.variants.length} Size{item.variants.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                      {item.modifiers && item.modifiers.length > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-bold border border-accent/30">
                                          <FaCog className="text-[8px]" />
                                          {item.modifiers.length} Add-on{item.modifiers.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Status Toggle */}
                                  <div className="flex flex-col items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleToggleAvailability(item)}
                                      className="relative"
                                      title="Toggle stock status"
                                    >
                                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${
                                        item?.available !== false ? 'bg-status-success' : 'bg-theme-bg-tertiary shadow-inner ring-1 ring-theme-border-primary'
                                      }`}>
                                        <div className={`w-4 h-4 rounded-full transform transition-transform duration-200 ${
                                          item?.available !== false ? 'bg-white shadow-md translate-x-4' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] translate-x-0'
                                        }`} />
                                      </div>
                                    </button>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                      item?.available !== false ? 'text-status-success' : 'text-theme-text-tertiary'
                                    }`}>
                                      {item?.available !== false ? 'Stock' : 'Out'}
                                    </span>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button 
                                      onClick={() => handleEdit(item)} 
                                      className="p-2 text-theme-text-tertiary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" 
                                      title="Edit Item"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(getItemId(item), item.name)} 
                                      className="p-2 text-theme-text-tertiary hover:text-status-error hover:bg-status-error-light rounded-lg transition-colors" 
                                      title="Delete Item"
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center">
                              <FaUtensils className="text-3xl text-theme-text-tertiary mx-auto mb-2" />
                              <p className="text-sm text-theme-text-secondary">No items in this category yet</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="admin-card rounded-xl p-12 text-center">
                <FaUtensils className="text-4xl text-theme-text-tertiary mx-auto mb-3" />
                <p className="text-theme-text-primary font-medium">No items found</p>
                <p className="text-theme-text-secondary text-sm mt-1">Try adjusting your search or add a new item.</p>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              onClick={() => !imageUploading && setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="admin-card rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border-primary bg-theme-bg-secondary shrink-0">
                  <div>
                    <h2 className="text-lg font-bold text-theme-text-primary">
                      {editingItem ? 'Edit Menu Item' : 'Create New Menu Item'}
                    </h2>
                    <p className="text-xs text-theme-text-secondary mt-0.5">
                      {editingItem ? 'Update item details' : 'Add a new item to your menu'}
                    </p>
                  </div>
                  <button onClick={() => setShowModal(false)} disabled={imageUploading} className="text-theme-text-tertiary hover:text-theme-text-primary disabled:opacity-50 transition-colors p-2 hover:bg-theme-bg-hover rounded-lg">
                    <FaTimes className="text-lg" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                  <form id="itemForm" onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Basic Information Section */}
                    <div className="bg-theme-bg-secondary/50 rounded-xl p-5 border border-theme-border-primary">
                      <h3 className="text-xs font-bold text-theme-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FaUtensils className="text-accent text-sm" />
                        Basic Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">Item Name *</label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g., Truffle Fries"
                            className="input-theme w-full px-3 py-2.5 rounded-lg text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">
                            Price (₹) *
                            {formData.variants && formData.variants.length > 0 && (
                              <span className="ml-2 text-[10px] text-accent font-normal">(synced with default size)</span>
                            )}
                          </label>
                          <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="0"
                            className="input-theme w-full px-3 py-2.5 rounded-lg text-sm"
                            required
                            disabled={formData.variants && formData.variants.length > 0}
                            title={formData.variants && formData.variants.length > 0 ? "Price is controlled by default size option" : ""}
                          />
                          {formData.variants && formData.variants.length > 0 && (
                            <p className="text-[10px] text-theme-text-tertiary mt-1">
                              💡 Price is set by the default (starred) size option below
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">
                          Category *
                          {lockedCategory && <span className="ml-2 text-[10px] text-accent font-normal">(locked)</span>}
                        </label>
                        <select
                          name="categoryId"
                          value={formData.categoryId}
                          onChange={handleChange}
                          className="input-theme w-full px-3 py-2.5 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                          required
                          disabled={!!lockedCategory} // Disable if category is locked
                        >
                          <option value="" disabled>Select a category</option>
                          {availableCategories.map(cat => {
                            const itemsInCat = getItemsInCategory(cat.id);
                            const catLimitReached = isCategoryLimitReached(cat.id);
                            return (
                              <option key={cat.id} value={cat.id} disabled={!editingItem && catLimitReached}>
                                {cat.name} ({itemsInCat}/{menuItemLimit === '∞' ? '∞' : menuItemLimit} items)
                                {catLimitReached && !editingItem ? ' - FULL' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {lockedCategory && (
                          <p className="text-xs text-theme-text-secondary mt-1">
                            Category is locked for this item
                          </p>
                        )}
                        {formData.categoryId && isCategoryLimitReached(formData.categoryId) && !editingItem && (
                          <p className="text-xs text-status-error mt-1">
                            ⚠️ This category has reached its limit of {menuItemLimit} items
                          </p>
                        )}
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">Description</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Describe the item..."
                          rows="2"
                          className="input-theme w-full px-3 py-2.5 rounded-lg text-sm resize-none"
                        ></textarea>
                      </div>
                    </div>

                    {/* Image Upload Section */}
                    <div className="bg-theme-bg-secondary/50 rounded-xl p-5 border border-theme-border-primary">
                      <h3 className="text-xs font-bold text-theme-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FaImage className="text-accent text-sm" />
                        Product Image
                      </h3>
                      <ImageUpload
                        currentImage={formData.image}
                        onImageChange={(imageUrl, file) => {
                          setFormData(prev => ({ ...prev, image: imageUrl }));
                          setSelectedImageFile(file);
                        }}
                        label="Upload image"
                        size="medium"
                        shape="rounded"
                        uploading={imageUploading}
                      />
                      {imageUploading && (
                        <div className="flex justify-center mt-2 text-xs font-medium text-accent gap-2">
                          <FaSpinner className="animate-spin" /> Uploading...
                        </div>
                      )}
                    </div>

                    {/* Tags & Toggles */}
                    <div className="grid grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer bg-theme-bg-secondary p-3 rounded-lg border border-theme-border-primary hover:border-accent transition-colors">
                        <input type="checkbox" name="available" checked={formData.available} onChange={handleChange} className="w-4 h-4 text-accent rounded border-theme-border-secondary focus:ring-accent" />
                        <span className="text-sm font-semibold text-theme-text-primary">In Stock</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-status-success-light p-3 rounded-lg border border-status-success/30 hover:border-status-success transition-colors">
                        <input type="checkbox" name="isVeg" checked={formData.isVeg} onChange={handleChange} className="w-4 h-4 text-status-success rounded border-status-success focus:ring-status-success" />
                        <span className="text-sm font-semibold text-status-success">Veg</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-status-error-light p-3 rounded-lg border border-status-error/30 hover:border-status-error transition-colors">
                        <input type="checkbox" name="isSpicy" checked={formData.isSpicy} onChange={handleChange} className="w-4 h-4 text-status-error rounded border-status-error focus:ring-status-error" />
                        <span className="text-sm font-semibold text-status-error">Spicy</span>
                      </label>
                    </div>

                    {/* ===== VARIANTS SECTION ===== */}
                    <div className="bg-theme-bg-secondary/50 rounded-xl p-4 border border-theme-border-primary">
                      {editingItem && formData.variants && formData.variants.length > 0 && (
                        <div className="mb-3 p-3 bg-accent/10 border border-accent/30 rounded-lg flex items-center gap-2">
                          <FaRulerCombined className="text-accent" />
                          <span className="text-xs font-semibold text-theme-text-primary">
                            Size options found - expand to edit
                          </span>
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={() => setShowVariants(!showVariants)}
                        className="w-full flex items-center justify-between p-4 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FaRulerCombined className="text-accent text-lg" />
                          <div className="text-left">
                            <h3 className="font-bold text-theme-text-primary text-sm">
                              Size Options {formData.variants && formData.variants.length > 0 && formData.variants[0]?.options?.length > 0 && `(${formData.variants[0].options.length} options)`}
                            </h3>
                            <p className="text-xs text-theme-text-secondary">Small, Medium, Large, etc. (One group per item)</p>
                          </div>
                        </div>
                        <FaChevronDown className={`text-accent transition-transform ${showVariants ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {showVariants && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
                              {formData.variants && formData.variants.length > 0 ? (
                                // Show the single variant group
                                <div className="admin-card rounded-lg p-4 border border-accent/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <input
                                      type="text"
                                      placeholder="Group name (e.g., Size)"
                                      value={formData.variants[0].name}
                                      onChange={(e) => updateVariant(0, 'name', e.target.value)}
                                      className="input-theme flex-1 text-sm font-semibold border-accent/30 focus:border-accent rounded-lg px-3 py-2"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => removeVariant(0)}
                                      className="text-status-error hover:bg-status-error-light p-2 rounded-lg transition-colors"
                                      title="Remove Size Group"
                                    >
                                      <FaTrash className="text-sm" />
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {formData.variants[0].options && formData.variants[0].options.map((option, oIndex) => (
                                      <div key={oIndex} className="flex items-center gap-2 bg-theme-bg-primary p-2 rounded-lg">
                                        <input
                                          type="text"
                                          placeholder="Option (e.g., Small)"
                                          value={option.name}
                                          onChange={(e) => updateVariantOption(0, oIndex, 'name', e.target.value)}
                                          className="input-theme flex-1 text-sm px-3 py-2 rounded"
                                        />
                                        <div className="flex items-center bg-theme-bg-secondary rounded px-2 py-2 border border-accent/20">
                                          <span className="text-xs font-bold text-accent">₹</span>
                                          <input
                                            type="number"
                                            placeholder="0"
                                            value={option.price}
                                            onChange={(e) => updateVariantOption(0, oIndex, 'price', e.target.value)}
                                            className="input-theme w-16 text-sm bg-transparent border-none focus:ring-0 font-semibold"
                                            title={option.isDefault ? "This is the base product price" : "Additional price for this size"}
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => toggleVariantDefault(0, oIndex)}
                                          className={`p-2 rounded transition-colors ${option.isDefault ? 'text-accent bg-accent/20' : 'text-theme-text-tertiary hover:text-accent'}`}
                                          title="Set as Default"
                                        >
                                          <FaStar className="text-sm" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeVariantOption(0, oIndex)}
                                          className="text-status-error hover:bg-status-error-light p-2 rounded transition-colors"
                                          title="Remove Option"
                                          disabled={formData.variants[0].options.length === 1}
                                        >
                                          <FaTimes className="text-sm" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => addVariantOption(0)}
                                      className="text-xs text-accent hover:text-accent/80 font-semibold flex items-center gap-1 px-2 py-1 hover:bg-accent/10 rounded transition-colors"
                                    >
                                      <FaPlus className="text-xs" /> Add Size Option
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Show button to create the first (and only) variant group
                                <button
                                  type="button"
                                  onClick={addVariant}
                                  className="w-full py-3 border-2 border-dashed border-accent/30 rounded-lg text-accent hover:bg-accent/10 transition-colors font-semibold flex items-center justify-center gap-2 text-sm"
                                >
                                  <FaPlus /> Add Size Group
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ===== MODIFIERS SECTION ===== */}
                    <div className="bg-theme-bg-secondary/50 rounded-xl p-4 border border-theme-border-primary">
                      {editingItem && formData.modifiers && formData.modifiers.length > 0 && (
                        <div className="mb-3 p-3 bg-accent/10 border border-accent/30 rounded-lg flex items-center gap-2">
                          <FaCog className="text-accent" />
                          <span className="text-xs font-semibold text-theme-text-primary">
                            Add-on options found - expand to edit
                          </span>
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={() => setShowModifiers(!showModifiers)}
                        className="w-full flex items-center justify-between p-4 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FaCog className="text-accent text-lg" />
                          <div className="text-left">
                            <h3 className="font-bold text-theme-text-primary text-sm">
                              Extra Add-ons {formData.modifiers && formData.modifiers.length > 0 && formData.modifiers[0]?.options?.length > 0 && `(${formData.modifiers[0].options.length} options)`}
                            </h3>
                            <p className="text-xs text-theme-text-secondary">Cheese, Toppings, Sauces, etc. (One group per item)</p>
                          </div>
                        </div>
                        <FaChevronDown className={`text-accent transition-transform ${showModifiers ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {showModifiers && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
                              {formData.modifiers && formData.modifiers.length > 0 ? (
                                // Show the single modifier group
                                <div className="admin-card rounded-lg p-4 border border-accent/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <input
                                      type="text"
                                      placeholder="Group name (e.g., Toppings)"
                                      value={formData.modifiers[0].name}
                                      onChange={(e) => updateModifier(0, 'name', e.target.value)}
                                      className="input-theme flex-1 text-sm font-semibold border-accent/30 focus:border-accent rounded-lg px-3 py-2"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => removeModifier(0)}
                                      className="text-status-error hover:bg-status-error-light p-2 rounded-lg transition-colors"
                                      title="Remove Add-on Group"
                                    >
                                      <FaTrash className="text-sm" />
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {formData.modifiers[0].options && formData.modifiers[0].options.map((option, oIndex) => (
                                      <div key={oIndex} className="flex items-center gap-2 bg-theme-bg-primary p-2 rounded-lg">
                                        <input
                                          type="text"
                                          placeholder="Option (e.g., Extra Cheese)"
                                          value={option.name}
                                          onChange={(e) => updateModifierOption(0, oIndex, 'name', e.target.value)}
                                          className="input-theme flex-1 text-sm px-3 py-2 rounded"
                                        />
                                        <div className="flex items-center bg-theme-bg-secondary rounded px-2 py-2 border border-accent/20">
                                          <span className="text-xs font-bold text-accent">+₹</span>
                                          <input
                                            type="number"
                                            placeholder="0"
                                            value={option.price}
                                            onChange={(e) => updateModifierOption(0, oIndex, 'price', e.target.value)}
                                            className="input-theme w-16 text-sm bg-transparent border-none focus:ring-0 font-semibold"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeModifierOption(0, oIndex)}
                                          className="text-status-error hover:bg-status-error-light p-2 rounded transition-colors"
                                          title="Remove Option"
                                          disabled={formData.modifiers[0].options.length === 1}
                                        >
                                          <FaTimes className="text-sm" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => addModifierOption(0)}
                                      className="text-xs text-accent hover:text-accent/80 font-semibold flex items-center gap-1 px-2 py-1 hover:bg-accent/10 rounded transition-colors"
                                    >
                                      <FaPlus className="text-xs" /> Add Add-on Option
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Show button to create the first (and only) modifier group
                                <button
                                  type="button"
                                  onClick={addModifier}
                                  className="w-full py-3 border-2 border-dashed border-accent/30 rounded-lg text-accent hover:bg-accent/10 transition-colors font-semibold flex items-center justify-center gap-2 text-sm"
                                >
                                  <FaPlus /> Add Add-on Group
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </form>
                </div>

                <div className="px-6 py-4 border-t border-theme-border-primary bg-theme-bg-secondary flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={imageUploading}
                    className="btn-secondary flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    form="itemForm"
                    type="submit"
                    disabled={imageUploading || !formData.name.trim() || !formData.price || !formData.categoryId}
                    className="btn-primary flex-[2] px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    {imageUploading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    {imageUploading ? 'Uploading...' : editingItem ? 'Save Changes' : 'Create Item'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
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
                <h3 className="text-xl font-bold text-theme-text-primary mb-2">Confirm Deletion</h3>
                <p className="text-sm text-theme-text-secondary mb-6">
                  Are you sure you want to delete <span className="font-bold text-theme-text-primary">"{deleteModal.itemName}"</span> from the catalog? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ show: false, itemId: null, itemName: '' })}
                    className="btn-secondary flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Abort
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-status-error text-white rounded-lg text-sm font-semibold hover:bg-status-error/80 transition-colors shadow-sm border border-status-error"
                  >
                    Delete Item
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {LimitReachedModal}
        {PaymentModal}
        {PaymentSuccessModal}
      </div>
    </SingleRestaurantLayout>
  );
};

export default MenuManagement;
