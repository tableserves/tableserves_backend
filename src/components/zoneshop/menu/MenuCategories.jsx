import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaSort,
  FaImage,
  FaUtensils,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import ZoneShopLayout from '../ZoneShopLayout';
import ImageUpload from '../../common/ImageUpload';
import { useDispatch, useSelector } from 'react-redux';
import { 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  fetchMenuCategories 
} from '../../../store/slices/menuSlice';

const MenuCategories = () => {
    const { zoneId, shopId } = useParams();
    const dispatch = useDispatch();
    const { categories = [], categoriesLoading: loading, categoriesError: error } = useSelector(state => state.menu);

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    displayOrder: '',
    active: true,
    color: '#FF6B35'
  });

  useEffect(() => {
    if (shopId) {
      // A shop's categories are fetched using its shopId as entityId with vendor entityType
      dispatch(fetchMenuCategories({ entityId: shopId, entityType: 'vendor' }));
    }
  }, [dispatch, shopId]);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCategories = [...filteredCategories].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleSubmit = (e) => {
    e.preventDefault();

    const categoryData = {
      ...formData,
      displayOrder: parseInt(formData.displayOrder)
    };

    if (editingCategory) {
      dispatch(updateCategory({
        entityId: shopId,
        entityType: 'vendor',
        categoryId: editingCategory.id,
        categoryData
      }));
    } else {
      dispatch(createCategory({
        entityId: shopId,
        entityType: 'vendor',
        categoryData
      }));
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: '',
      displayOrder: '',
      active: true,
      color: '#FF6B35'
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
      displayOrder: category.displayOrder.toString(),
      active: category.active,
      color: category.color
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      dispatch(deleteCategory({ 
        entityId: shopId, 
        entityType: 'vendor', 
        categoryId 
      }));
    }
  };

  const toggleActive = (category) => {
    dispatch(updateCategory({ 
      entityId: shopId, 
      entityType: 'vendor',
      categoryId: category.id, 
      categoryData: { ...category, active: !category.active } 
    }));
  };

  return (
    <ZoneShopLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-secondary mb-2">Menu Categories</h1>
            <p className="text-theme-text-secondary font-raleway">Organize your menu items into categories</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="w-full sm:w-auto bg-theme-accent-secondary hover:bg-theme-accent-hover text-theme-text-inverse px-4 py-2 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
          >
            <FaPlus />
            <span>Add Category</span>
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`admin-card rounded-2xl overflow-hidden ${!category.active ? 'opacity-60' : ''}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-secondary font-fredoka text-lg">{category.name}</h3>
                    <p className="text-secondary/60 font-raleway text-sm">{category.itemCount} items</p>
                  </div>
                </div>
                <p className="text-secondary/70 font-raleway text-sm mb-3 line-clamp-2">{category.description}</p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg font-raleway text-sm flex items-center justify-center space-x-2"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => toggleActive(category)}
                    className={`flex-1 py-2 rounded-lg font-raleway text-sm flex items-center justify-center space-x-1 ${category.active ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
                    {category.active ? <FaEyeSlash /> : <FaEye />}
                    <span>{category.active ? 'Hide' : 'Show'}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-theme-bg-secondary  border border-secondary/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-fredoka text-secondary mb-6">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <form onSubmit={handleSubmit} className="text-secondary space-y-6">
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg font-raleway transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-accent hover:bg-accent/90 text-secondary rounded-lg font-raleway transition-colors"
                    >
                      {editingCategory ? 'Update Category' : 'Add Category'}
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

export default MenuCategories;
