import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaTag,
  FaDollarSign,
  FaCheckCircle,
  FaTimesCircle,
  FaCopy,
  FaList,
  FaRupeeSign
} from 'react-icons/fa';
import ZoneShopLayout from '../ZoneShopLayout';

const MenuModifiers = () => {
    const { zoneId, shopId } = useParams();

  const [modifiers, setModifiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingModifier, setEditingModifier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'single',
    required: false,
    options: [{ name: '', price: 0 }]
  });

  // Get real modifiers from localStorage
  const getModifiers = () => {
    try {
      return JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_shop_${shopId}_modifiers`) || '[]');
    } catch (error) {
      console.error('Error loading modifiers:', error);
      return [];
    }
  };

  useEffect(() => {
    const loadModifiers = () => {
      setLoading(true);
      const realModifiers = getModifiers();
      setModifiers(realModifiers);
      setLoading(false);
    };

    loadModifiers();
  }, [zoneId, shopId]);

  const filteredModifiers = modifiers.filter(modifier => {
    const matchesSearch = modifier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || modifier.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingModifier) {
      setModifiers(modifiers.map(modifier =>
        modifier.id === editingModifier.id
          ? {
            ...modifier,
            ...formData,
            options: formData.options.map((option, index) => ({
              ...option,
              id: option.id || Date.now() + index,
              price: parseFloat(option.price) || 0
            }))
          }
          : modifier
      ));
    } else {
      const newModifier = {
        ...formData,
        id: Date.now(),
        options: formData.options.map((option, index) => ({
          ...option,
          id: Date.now() + index,
          price: parseFloat(option.price) || 0
        })),
        usageCount: 0
      };
      setModifiers([...modifiers, newModifier]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'single',
      required: false,
      options: [{ name: '', price: 0 }]
    });
    setEditingModifier(null);
    setShowForm(false);
  };

  const handleEdit = (modifier) => {
    setFormData({
      name: modifier.name,
      type: modifier.type,
      required: modifier.required,
      options: modifier.options.map(option => ({
        name: option.name,
        price: option.price
      }))
    });
    setEditingModifier(modifier);
    setShowForm(true);
  };

  const handleDelete = (modifierId) => {
    if (window.confirm('Are you sure you want to delete this modifier?')) {
      setModifiers(modifiers.filter(modifier => modifier.id !== modifierId));
    }
  };

  const duplicateModifier = (modifier) => {
    const newModifier = {
      ...modifier,
      id: Date.now(),
      name: `${modifier.name} (Copy)`,
      usageCount: 0,
      options: modifier.options.map((option, index) => ({
        ...option,
        id: Date.now() + index
      }))
    };
    setModifiers([...modifiers, newModifier]);
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { name: '', price: 0 }]
    });
  };

  const removeOption = (index) => {
    if (formData.options.length > 1) {
      setFormData({
        ...formData,
        options: formData.options.filter((_, i) => i !== index)
      });
    }
  };

  const updateOption = (index, field, value) => {
    const updatedOptions = formData.options.map((option, i) =>
      i === index ? { ...option, [field]: value } : option
    );
    setFormData({ ...formData, options: updatedOptions });
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-secondary text-xl">Loading modifiers...</div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ZoneShopLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Menu Modifiers</h1>
            <p className="text-secondary/70 font-raleway">Create customization options for your menu items</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-secondary px-4 py-2 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
          >
            <FaPlus />
            <span>Add Modifier</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-secondary backdrop-blur-lg rounded-xl p-4 border border-secondary/10">
            <h3 className="text-2xl font-fredoka text-secondary">{modifiers.length}</h3>
            <p className="text-secondary/70 font-raleway text-sm">Total Modifiers</p>
          </div>
          <div className="bg-secondary backdrop-blur-lg rounded-xl p-4 border border-secondary/10">
            <h3 className="text-2xl font-fredoka text-blue-400">{modifiers.filter(m => m.type === 'single').length}</h3>
            <p className="text-secondary/70 font-raleway text-sm">Single Choice</p>
          </div>
          <div className="bg-secondary backdrop-blur-lg rounded-xl p-4 border border-secondary/10">
            <h3 className="text-2xl font-fredoka text-green-400">{modifiers.filter(m => m.type === 'multiple').length}</h3>
            <p className="text-secondary/70 font-raleway text-sm">Multiple Choice</p>
          </div>
          <div className="bg-secondary backdrop-blur-lg rounded-xl p-4 border border-secondary/10">
            <h3 className="text-2xl font-fredoka text-yellow-400">{modifiers.filter(m => m.required).length}</h3>
            <p className="text-secondary/70 font-raleway text-sm">Required</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-secondary backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-secondary/10">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary/50" />
              <input
                type="text"
                placeholder="Search modifiers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-secondary border border-secondary/20 rounded-lg pl-10 pr-4 py-2 text-secondary placeholder-primary/50 focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-secondary border border-secondary/20 rounded-lg px-4 py-2 text-secondary focus:outline-none focus:border-accent"
            >
              <option value="all">All Types</option>
              <option value="single">Single Choice</option>
              <option value="multiple">Multiple Choice</option>
            </select>
          </div>
        </div>

        {/* Modifiers List */}
        <div className="space-y-4">
          {filteredModifiers.map((modifier) => (
            <motion.div
              key={modifier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary backdrop-blur-lg rounded-2xl p-6 border border-secondary"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                    <FaTag className="text-accent text-xl" />
                  </div>
                  <div>
                    <h3 className="text-secondary font-fredoka text-lg">{modifier.name}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-raleway ${modifier.type === 'single'
                        ? 'text-blue-400 bg-blue-500/20'
                        : 'text-green-400 bg-green-500/20'
                        }`}>
                        {modifier.type === 'single' ? 'Single Choice' : 'Multiple Choice'}
                      </span>
                      {modifier.required && (
                        <span className="px-3 py-1 rounded-full text-xs font-raleway text-yellow-400 bg-yellow-500/20">
                          Required
                        </span>
                      )}
                      <span className="text-secondary/60 font-raleway text-sm">
                        Used in {modifier.usageCount} items
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => duplicateModifier(modifier)}
                    className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <FaCopy />
                  </button>
                  <button
                    onClick={() => handleEdit(modifier)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(modifier.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="bg-secondary rounded-lg p-4">
                <h4 className="text-secondary font-raleway font-medium mb-3 flex items-center space-x-2">
                  <FaList className="text-secondary/60" />
                  <span>Options ({modifier.options.length})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {modifier.options.map((option) => (
                    <div key={option.id} className="bg-secondary border border-secondary rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary font-raleway">{option.name}</span>
                        <div className="flex items-center space-x-1">
                          <FaRupeeSign className="text-accent text-sm" />
                          <span className="text-accent font-sans font-medium">
                            {option.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add/Edit Modifier Modal */}
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
                className="bg-secondary backdrop-blur-xl border border-secondary/20 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-fredoka text-secondary mb-6">
                  {editingModifier ? 'Edit Modifier' : 'Add New Modifier'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-secondary font-raleway mb-2">Modifier Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-secondary border border-secondary/20 rounded-lg px-4 py-2 text-secondary focus:outline-none focus:border-accent"
                        placeholder="e.g., Pizza Size, Extra Toppings"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-secondary font-raleway mb-2">Selection Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full bg-secondary border border-secondary/20 rounded-lg px-4 py-2 text-secondary focus:outline-none focus:border-accent"
                      >
                        <option value="single">Single Choice</option>
                        <option value="multiple">Multiple Choice</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={formData.required}
                      onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                      className="w-4 h-4 text-accent bg-secondary border-secondary/20 rounded focus:ring-accent"
                    />
                    <label htmlFor="required" className="text-secondary font-raleway">
                      Required modifier (customers must select an option)
                    </label>
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-secondary font-raleway">Options</label>
                      <button
                        type="button"
                        onClick={addOption}
                        className="bg-accent hover:bg-accent/90 text-white px-3 py-1 rounded-lg font-raleway text-sm flex items-center space-x-2"
                      >
                        <FaPlus />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.options.map((option, index) => (
                        <div key={index} className="bg-secondary border border-secondary/20 rounded-lg p-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) => updateOption(index, 'name', e.target.value)}
                                className="w-full bg-secondary border border-secondary/20 rounded-lg px-4 py-2 text-secondary focus:outline-none focus:border-accent"
                                placeholder="Option name"
                                required
                              />
                            </div>
                            <div className="w-32">
                              <div className="relative">
                                
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={option.price}
                                  onChange={(e) => updateOption(index, 'price', e.target.value)}
                                  className="w-full bg-secondary border border-secondary/20 rounded-lg pl-8 pr-4 py-2 text-secondary focus:outline-none focus:border-accent"
                                  placeholder="₹100"
                                />
                              </div>
                            </div>
                            {formData.options.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOption(index)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 bg-primary/10 hover:bg-primary/20 text-secondary rounded-lg font-raleway transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-raleway transition-colors"
                    >
                      {editingModifier ? 'Update Modifier' : 'Add Modifier'}
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

export default MenuModifiers;
