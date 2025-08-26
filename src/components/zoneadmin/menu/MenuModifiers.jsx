import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaCog,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaStore
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import { 
  fetchMenuModifiers, 
  createModifier, 
  updateModifier, 
  deleteModifier 
} from '../../../store/slices/menuSlice';
import { usePlanRestrictions } from '../../subscription/PlanRestrictions';

const ZoneMenuModifiers = () => {
  const { zoneId } = useParams();
  const dispatch = useDispatch();
  const { modifiers = [], modifiersLoading: loading, modifiersError: error } = useSelector(state => state.menu);
  
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

  const [showModal, setShowModal] = useState(false);
  const [editingModifier, setEditingModifier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'single',
    required: false,
    availableForShops: 'all',
    options: []
  });
  const [newOption, setNewOption] = useState({ name: '', price: 0 });

  useEffect(() => {
    if (zoneId) {
      dispatch(fetchMenuModifiers({ entityId: zoneId, entityType: 'zone' }));
    }
  }, [dispatch, zoneId]);

  const handleAddModifier = () => {
    // Check modifier restrictions for non-premium plans
    if (!subscription?.features?.modifiers) {
      handleUpgrade();
      return;
    }
    
    setEditingModifier(null);
    setFormData({
      name: '',
      type: 'single',
      required: false,
      availableForShops: 'all',
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
      availableForShops: modifier.availableForShops || 'all',
      options: [...modifier.options]
    });
    setShowModal(true);
  };

  const handleSaveModifier = () => {
    if (!formData.name.trim() || formData.options.length === 0) {
      alert('Please provide a name and at least one option for the modifier.');
      return;
    }

    if (editingModifier) {
      dispatch(updateModifier({ 
        entityId: zoneId,
        entityType: 'zone',
        modifierId: editingModifier.id, 
        modifierData: formData 
      }));
    } else {
      dispatch(createModifier({ 
        entityId: zoneId,
        entityType: 'zone',
        modifierData: formData 
      }));
    }
    setShowModal(false);
  };

  const handleDeleteModifier = (modifierId) => {
    if (window.confirm('Are you sure you want to delete this modifier? This will affect all shops using it.')) {
      dispatch(deleteModifier({ 
        entityId: zoneId,
        entityType: 'zone',
        modifierId 
      }));
    }
  };

  const addOption = () => {
    if (newOption.name.trim()) {
      const option = {
        id: Date.now(), // Note: Backend should generate a proper ID
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
    <ZoneAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Plan Status Badge */}
        <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Zone Menu Modifiers</h1>
            <p className="text-secondary font-raleway text-sm sm:text-base">Create modifiers that shops in your zone can use</p>
            {subscription && (
              <p className="text-theme-text-tertiary font-raleway text-sm mt-1">
                Modifiers: {modifiers.length} • {subscription.features?.modifiers ? 'Enabled' : 'Upgrade Required'}
              </p>
            )}
          </div>
          <FeatureRestriction 
            feature="modifiers" 
            subscription={subscription}
            fallback={
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpgrade}
                className="mt-4 sm:mt-0 btn-secondary px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
              >
                <FaPlus />
                <span>Upgrade for Modifiers</span>
              </motion.button>
            }
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddModifier}
              className="mt-4 sm:mt-0 btn-primary px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Modifier</span>
            </motion.button>
          </FeatureRestriction>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* Modifiers List */}
        <div className="space-y-6">
          {modifiers.map((modifier) => (
            <motion.div
              key={modifier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card rounded-2xl p-6 hover:border-accent/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    <FaCog className="text-inverse text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-fredoka text-secondary">{modifier.name}</h3>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditModifier(modifier)}
                      className="bg-blue-500 hover:bg-blue-600 text-secondary p-2 rounded-lg"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteModifier(modifier.id)}
                      className="bg-red-500 hover:bg-red-600 text-secondary p-2 rounded-lg"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && modifiers.length === 0 && (
          <div className="text-center py-12">
            <FaCog className="text-6xl text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-primary mb-2">No Modifiers Found</h3>
            <p className="text-secondary font-raleway mb-4">Create modifiers that shops in your zone can use for their menu items.</p>
            <FeatureRestriction 
              feature="modifiers" 
              subscription={subscription}
              fallback={
                <button
                  onClick={handleUpgrade}
                  className="btn-secondary px-6 py-3 rounded-xl font-raleway font-semibold"
                >
                  Upgrade for Modifiers
                </button>
              }
            >
              <button
                onClick={handleAddModifier}
                className="btn-primary px-6 py-3 rounded-xl font-raleway font-semibold"
              >
                Create First Modifier
              </button>
            </FeatureRestriction>
          </div>
        )}

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-secondary hover:bg-tertiary text-secondary py-3 rounded-lg font-raleway"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveModifier}
                    disabled={!formData.name.trim() || formData.options.length === 0}
                    className="flex-1 btn-primary py-3 rounded-lg font-raleway font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingModifier ? 'Update' : 'Create'} Modifier
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

export default ZoneMenuModifiers;