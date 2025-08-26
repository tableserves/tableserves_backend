import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaFilter,
  FaImage,
  FaUpload,
  FaCheckCircle,
  FaTimesCircle,
  FaStar
} from 'react-icons/fa';
import ZoneShopLayout from '../ZoneShopLayout';
import ImageUpload from '../../common/ImageUpload';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem 
} from '../../../store/slices/menuSlice';
import { fetchMenuCategories } from '../../../store/slices/menuSlice';


const MenuItems = () => {
  const { zoneId, shopId } = useParams();
  const dispatch = useDispatch();
  
  const { items: menuItems = [], itemsLoading: loading, itemsError: error } = useSelector((state) => state.menu);
  const { categories = [] } = useSelector(state => state.menu);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: '',
    preparationTime: '',
    available: true,
    popular: false,
    ingredients: '',
    allergens: ''
  });

  useEffect(() => {
    if (shopId) {
      // Fetch items for this specific shop
      dispatch(fetchMenuItems({ shopId }));
      // Fetch categories available for the zone
      dispatch(fetchMenuCategories({ entityId: zoneId, entityType: 'zone' }));
    }
  }, [dispatch, shopId, zoneId]);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryName = categories.find(c => c.id === item.categoryId)?.name || '';
    const matchesCategory = categoryFilter === 'all' || categoryName === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const itemData = {
      ...formData,
      price: parseFloat(formData.price),
      preparationTime: parseInt(formData.preparationTime)
    };

    if (editingItem) {
      // For a shop, the restaurantId is the shopId
      dispatch(updateMenuItem({ 
        restaurantId: shopId, 
        itemId: editingItem.id, 
        itemData 
      }));
    } else {
      dispatch(createMenuItem({
        restaurantId: shopId,
        categoryId: itemData.categoryId,
        itemData
      }));
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      image: '',
      preparationTime: '',
      available: true,
      popular: false,
      ingredients: '',
      allergens: ''
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      categoryId: item.categoryId,
      image: item.image,
      preparationTime: item.preparationTime.toString(),
      available: item.available,
      popular: item.popular,
      ingredients: item.ingredients,
      allergens: item.allergens
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (itemId) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      dispatch(deleteMenuItem({ restaurantId: shopId, itemId }));
    }
  };

  const toggleAvailability = (item) => {
    dispatch(updateMenuItem({ 
      restaurantId: shopId, 
      itemId: item.id, 
      itemData: { ...item, available: !item.available } 
    }));
  };

  return (
    <ZoneShopLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Menu Items</h1>
            <p className="text-theme-text-secondary font-raleway">Manage your restaurant's menu items</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="w-full sm:w-auto bg-theme-accent-primary hover:bg-theme-accent-hover text-theme-text-inverse px-4 py-2 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
          >
            <FaPlus />
            <span>Add Menu Item</span>
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* Search and Filters */}
        <div className="admin-card rounded-2xl p-4 sm:p-6">
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

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`admin-card rounded-2xl overflow-hidden ${!item.available ? 'opacity-60' : ''}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-theme-text-primary font-fredoka text-lg">{item.name}</h3>
                    <p className="text-theme-text-secondary font-raleway text-sm">{categories.find(c=>c.id === item.categoryId)?.name}</p>
                  </div>
                  <p className="text-theme-accent-primary font-sans text-xl">₹{item.price.toLocaleString('en-IN')}</p>
                </div>
                <p className="text-theme-text-secondary font-raleway text-sm mb-3 line-clamp-2">{item.description}</p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 bg-status-info hover:bg-status-info/80 text-theme-text-inverse py-2 px-3 rounded-lg font-raleway text-sm flex items-center justify-center space-x-2"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-status-error hover:bg-status-error/80 text-theme-text-inverse py-2 px-3 rounded-lg"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add/Edit Item Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="admin-card backdrop-blur-xl border border-theme-border-primary rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-fredoka text-theme-text-primary mb-6">
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2">Category</label>
                      <select
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleChange}
                        className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none"
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-secondary px-6 py-2 rounded-lg font-raleway transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-6 py-2 rounded-lg font-raleway transition-colors"
                    >
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ZoneShopLayout>
  );
};

export default MenuItems;
