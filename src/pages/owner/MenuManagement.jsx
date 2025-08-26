import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUtensils,
  FaSearch,
  FaSave,
  FaTimes,
  FaLeaf,
  FaFire
} from 'react-icons/fa';
import SingleRestaurantLayout from '../../components/owner/SingleRestaurantLayout';
import ImageUpload from '../../components/common/ImageUpload';
import { 
  fetchMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  hydrateMenuData
} from '../../store/slices/menuSlice';
import { fetchMenuCategories } from '../../store/slices/menuSlice';
import { usePlanRestrictions } from '../../components/subscription/PlanRestrictions';

const MenuManagement = () => {
  const { restaurantId } = useParams();
  const dispatch = useDispatch();
  const menuItemsState = useSelector((state) => state.menu);
  const menuItems = Array.isArray(menuItemsState.items) ? menuItemsState.items : [];
  const menuItemsLoading = menuItemsState.itemsLoading;
  const menuItemsError = menuItemsState.itemsError;
  const { categories: availableCategories = [], categoriesLoading, categoriesError } = useSelector((state) => state.menu);
  
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
    console.log('Restaurant MenuManagement - Subscription Debug:', {
      subscription,
      currentCounts,
      restaurantId,
      subscriptionKey: subscription?.key,
      maxMenuItems: subscription?.maxMenuItems,
      planType: subscription?.planType,
      menuItemsLength: menuItems.length
    });
  }, [subscription, currentCounts, menuItems.length, restaurantId]);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '', // Changed from category to categoryId
    isVeg: false,
    isSpicy: false,
    image: '',
    available: true
  });

  useEffect(() => {
    if (restaurantId) {
      // Use hydration to ensure all menu data is synchronized from localStorage
      dispatch(hydrateMenuData({ entityId: restaurantId, entityType: 'restaurant' }));
    }
  }, [restaurantId, dispatch]);

  const loading = menuItemsLoading || categoriesLoading;
  const error = menuItemsError || categoriesError;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const itemData = {
      ...formData,
      price: parseFloat(formData.price),
    };

    if (editingItem) {
      await dispatch(updateMenuItem({ 
        entityId: restaurantId,
        entityType: 'restaurant',
        itemId: editingItem.id, 
        itemData 
      }));
    } else {
      await dispatch(createMenuItem({ 
        entityId: restaurantId,
        entityType: 'restaurant',
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
      isVeg: false,
      isSpicy: false,
      image: '',
      available: true
    });
    setEditingItem(null);
    setShowModal(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      categoryId: item.categoryId,
      isVeg: item.isVeg || false,
      isSpicy: item.isSpicy || false,
      image: item.image || '',
      available: item.available !== undefined ? item.available : true
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await dispatch(deleteMenuItem({ 
        entityId: restaurantId,
        entityType: 'restaurant',
        itemId 
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const filteredItems = (menuItems || []).filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <SingleRestaurantLayout>
      <div className="container mx-auto p-0">
        {/* Plan Status Badge */}
        <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} />
        
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Menu Management</h1>
        <div className="mb-4 text-sm text-gray-600">
          Menu Items: {currentCounts.menuItems}/{subscription?.maxMenuItems || '∞'}
        </div>

        {loading && <p>Loading menu data...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => {
              // Check if user can add more menu items
              if (!checkLimit('menuItems')) {
                return; // Modal will be shown by checkLimit
              }
              setEditingItem(null); 
              resetForm(); 
              setShowModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center transition duration-300 ease-in-out"
          >
            <FaPlus className="mr-2" /> Add New Item
          </button>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Search menu items..."
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {availableCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-5 py-5 text-sm">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-xs">No Image</div>
                      )}
                    </td>
                    <td className="px-5 py-5 text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-5 py-5 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-5 py-5 text-sm text-gray-900">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-5 py-5 text-sm text-gray-900">
                      {availableCategories.find(cat => cat.id === item.categoryId)?.name || 'N/A'}
                    </td>
                    <td className="px-5 py-5 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {item.isVeg && <FaLeaf className="text-green-500" title="Vegetarian" />}
                        {item.isSpicy && <FaFire className="text-red-500" title="Spicy" />}
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm text-gray-900">
                      {item.available ? (
                        <span className="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight">
                          <span aria-hidden="true" className="absolute inset-0 bg-green-200 opacity-50 rounded-full"></span>
                          <span className="relative">Yes</span>
                        </span>
                      ) : (
                        <span className="relative inline-block px-3 py-1 font-semibold text-red-900 leading-tight">
                          <span aria-hidden="true" className="absolute inset-0 bg-red-200 opacity-50 rounded-full"></span>
                          <span className="relative">No</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-5 text-sm">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 transition duration-300 ease-in-out"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 transition duration-300 ease-in-out"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-5 py-5 text-center text-gray-500">
                    No menu items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal for Add/Edit Item */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full mx-4"
            >
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                <div className="mb-4">
                  <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {availableCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <ImageUpload
                    currentImage={formData.image}
                    onImageChange={(imageUrl) => setFormData(prev => ({ ...prev, image: imageUrl }))}
                    label="Item Image"
                    size="medium"
                    shape="rounded"
                  />
                </div>

                <div className="flex items-center space-x-4 mb-6">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="isVeg"
                      checked={formData.isVeg}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Vegetarian
                  </label>
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="isSpicy"
                      checked={formData.isSpicy}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Spicy
                  </label>
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="available"
                      checked={formData.available}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Available
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition duration-300 ease-in-out flex items-center"
                  >
                    <FaTimes className="mr-2" /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center transition duration-300 ease-in-out"
                  >
                    <FaSave className="mr-2" /> {editingItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </form>
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

export default MenuManagement;