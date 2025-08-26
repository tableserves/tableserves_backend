import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaCog,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaTimes,
  FaDollarSign,
  FaList
} from 'react-icons/fa';
import SingleRestaurantLayout from '../../components/owner/SingleRestaurantLayout';
import { fetchMenuModifiers, createModifier, updateModifier, deleteModifier } from '../../store/slices/menuSlice';

const MenuModifiers = () => {
  const { restaurantId } = useParams();
  const dispatch = useDispatch();
  const { modifiers = [] } = useSelector(state => state.menu);

  const [showModal, setShowModal] = useState(false);
  const [editingModifier, setEditingModifier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'single', // single, multiple
    required: false,
    options: []
  });
  const [newOption, setNewOption] = useState({ name: '', price: 0 });

  useEffect(() => {
    if (restaurantId) {
      dispatch(fetchMenuModifiers({ entityId: restaurantId, entityType: 'restaurant' }));
    }
  }, [dispatch, restaurantId]);

  const handleAddModifier = () => {
    setEditingModifier(null);
    setFormData({
      name: '',
      type: 'single',
      required: false,
      options: []
    });
    setShowModal(true);
  };

  const handleEditModifier = (modifier) => {
    setEditingModifier(modifier);
    setFormData({
      name: modifier.name,
      type: modifier.type,
      required: modifier.required,
      options: [...modifier.options]
    });
    setShowModal(true);
  };

  const handleSaveModifier = () => {
    if (editingModifier) {
      dispatch(updateModifier({ 
        entityId: restaurantId,
        entityType: 'restaurant',
        modifierId: editingModifier.id,
        modifierData: formData 
      }));
    } else {
      dispatch(createModifier({
        entityId: restaurantId,
        entityType: 'restaurant',
        modifierData: formData
      }));
    }
    setShowModal(false);
  };

  const handleDeleteModifier = (modifierId) => {
    if (window.confirm('Are you sure you want to delete this modifier?')) {
      dispatch(deleteModifier({
        entityId: restaurantId,
        entityType: 'restaurant',
        modifierId
      }));
    }
  };

  const addOption = () => {
    if (newOption.name.trim()) {
      const option = {
        id: Date.now(),
        name: newOption.name,
        price: parseFloat(newOption.price) || 0
      };
      setFormData({
        ...formData,
        options: [...formData.options, option]
      });
      setNewOption({ name: '', price: 0 });
    }
  };

  const removeOption = (optionId) => {
    setFormData({
      ...formData,
      options: formData.options.filter(option => option.id !== optionId)
    });
  };

  return (
    <SingleRestaurantLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Menu Modifiers</h1>
            <p className="text-secondary font-raleway text-sm sm:text-base">Create customization options for your menu items</p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddModifier}
            className="mt-4 sm:mt-0 btn-primary px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
          >
            <FaPlus />
            <span>Add Modifier</span>
          </motion.button>
        </div>

        {/* Modifiers List */}
        <div className="space-y-6">
          {modifiers.map((modifier) => (
            <motion.div
              key={modifier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card rounded-2xl p-6 hover:border-accent/30 transition-all duration-300"
            >
              {/* Modifier Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    <FaCog className="text-inverse text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-raleway text-secondary mb-2">{modifier.name}</h3>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className={`px-1 py-1 rounded-full font-raleway ${
                        modifier.type === 'single' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {modifier.type === 'single' ? 'Single Choice' : 'Multiple Choice'}
                      </span>
                      <span className={`px-2 py-1 rounded-full font-raleway ${
                        modifier.required 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {modifier.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditModifier(modifier)}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteModifier(modifier.id)}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {modifier.options.map((option) => (
                  <div key={option.id} className="bg-secondary p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary font-raleway font-medium">{option.name}</span>
                      <span className="text-accent font-sans font-semibold">
                        {option.price > 0 ? `+₹${option.price.toFixed(2)}` : 'Free'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {modifier.options.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-tertiary font-raleway">No options added yet</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {modifiers.length === 0 && (
          <div className="text-center py-12">
            <FaCog className="text-6xl text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-secondary mb-2">No Modifiers Found</h3>
            <p className="text-secondary font-raleway mb-4">Create modifiers to allow customers to customize their orders.</p>
            <button
              onClick={handleAddModifier}
              className="btn-secondary px-6 py-3 rounded-xl font-raleway font-semibold"
            >
              Create First Modifier
            </button>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-theme-bg-primary border border-theme-border-primary rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-fredoka text-theme-text-primary">
                  {editingModifier ? 'Edit Modifier' : 'Add New Modifier'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Modifier Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Size Options, Extra Toppings"
                      className="bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary w-full px-4 py-3 rounded-lg font-raleway focus:outline-none focus:border-theme-accent-primary placeholder:text-theme-text-tertiary"
                    />
                  </div>

                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Selection Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary w-full px-4 py-3 rounded-lg font-raleway focus:outline-none focus:border-theme-accent-primary"
                    >
                      <option value="single">Single Choice (radio buttons)</option>
                      <option value="multiple">Multiple Choice (checkboxes)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="required"
                    checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    className="w-4 h-4 text-accent"
                  />
                  <label htmlFor="required" className="text-theme-text-primary font-raleway">
                    Required (customers must select an option)
                  </label>
                </div>

                {/* Options */}
                <div>
                  <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Options</h3>
                  
                  {/* Add New Option */}
                  <div className="bg-secondary p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={newOption.name}
                        onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                        placeholder="Option name"
                        className="bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary px-3 py-2 rounded-lg font-raleway focus:outline-none focus:border-theme-accent-primary placeholder:text-theme-text-tertiary"
                      />
                      <input
                        type="number"
                        step="1"
                        min=""
                        value={newOption.price}
                        onChange={(e) => setNewOption({ ...newOption, price: e.target.value })}
                        placeholder="Additional price"
                        className="input-theme px-3 py-2 rounded-lg font-raleway"
                      />
                      <button
                        onClick={addOption}
                        className="btn-secondary px-4 py-2 rounded-lg font-raleway flex items-center justify-center space-x-1"
                      >
                        <FaPlus />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2">
                    {formData.options.map((option) => (
                      <div key={option.id} className="flex items-center justify-between bg-tertiary p-3 rounded-lg">
                        <div>
                          <span className="text-theme-text-primary font-raleway font-medium">{option.name}</span>
                          <span className="text-accent font-sans ml-2">
                            {option.price > 0 ? `+₹${option.price.toFixed(2)}` : 'Free'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeOption(option.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>

                  {formData.options.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-tertiary font-raleway">No options added yet. Add options above.</p>
                    </div>
                  )}
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
                  onClick={handleSaveModifier}
                  disabled={!formData.name.trim() || formData.options.length === 0}
                  className="flex-1 btn-secondary py-3 rounded-lg font-raleway font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingModifier ? 'Update' : 'Create'} Modifier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </SingleRestaurantLayout>
  );
};

export default MenuModifiers;