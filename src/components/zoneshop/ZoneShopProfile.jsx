import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaStore,
  FaEdit,
  FaSave,
  FaTimes,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaRupeeSign,
  FaStar,
  FaGlobe,
  FaInstagram,
  FaFacebook
} from 'react-icons/fa';
import ZoneShopLayout from './ZoneShopLayout';
import ImageUpload from '../common/ImageUpload';
import ProfileOTPVerification from '../common/ProfileOTPVerification';
import { useParams } from 'react-router-dom';

const ZoneShopProfile = () => {
  const { zoneId, shopId } = useParams();
  const [shopData, setShopData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  // Get real vendor data from localStorage (zone admin created data)
  const getVendorData = () => {
    try {
      const vendors = JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_vendors`) || '[]');
      return vendors.find(v => v.id === shopId) || null;
    } catch (error) {
      console.error('Error loading vendor data:', error);
      return null;
    }
  };

  // Get vendor profile data (vendor editable fields)
  const getVendorProfile = () => {
    try {
      return JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_shop_${shopId}_profile`) || '{}');
    } catch (error) {
      console.error('Error loading vendor profile:', error);
      return {};
    }
  };

  // Save vendor profile data
  const saveVendorProfile = (profileData) => {
    try {
      localStorage.setItem(`tableserve_zone_${zoneId}_shop_${shopId}_profile`, JSON.stringify(profileData));
      return true;
    } catch (error) {
      console.error('Error saving vendor profile:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadShopData = () => {
      setLoading(true);

      // Get zone admin data (read-only)
      const vendorData = getVendorData();

      // Get vendor profile data (editable)
      const profileData = getVendorProfile();

      // Combine both data sources
      const combinedData = {
        // Zone admin data (read-only)
        id: vendorData?.id || '',
        name: vendorData?.name || '',
        description: vendorData?.description || '',
        cuisine: vendorData?.cuisine || '',
        ownerName: vendorData?.ownerName || '',
        ownerPhone: vendorData?.ownerPhone || '',
        ownerEmail: vendorData?.ownerEmail || '',
        status: vendorData?.status || 'active',
        createdAt: vendorData?.createdAt || '',

        // Vendor editable data
        logo: profileData.logo || '',
        coverImage: profileData.coverImage || '',
        address: profileData.address || '',
        openingHours: profileData.openingHours || '',
        socialMedia: profileData.socialMedia || {
          website: '',
          instagram: '',
          facebook: ''
        },
        paymentMethods: profileData.paymentMethods || [],
        deliveryRadius: profileData.deliveryRadius || '',
        minimumOrder: profileData.minimumOrder || '',

        // Analytics data
        rating: vendorData?.rating || 0,
        totalReviews: vendorData?.totalOrders || 0,
        zone: {
          name: 'Zone ' + (vendorData?.zoneId || ''),
          id: vendorData?.zoneId || ''
        }
      };

      setShopData(combinedData);
      setFormData(combinedData);
      setLoading(false);
    };

    loadShopData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    // Only save vendor-editable fields
    const profileData = {
      logo: formData.logo,
      coverImage: formData.coverImage,
      address: formData.address,
      openingHours: formData.openingHours,
      socialMedia: formData.socialMedia,
      paymentMethods: formData.paymentMethods,
      deliveryRadius: formData.deliveryRadius,
      minimumOrder: formData.minimumOrder
    };

    const success = saveVendorProfile(profileData);

    if (success) {
      setShopData(formData);
      setShowEditModal(false);
    } else {
      alert('Failed to save profile. Please try again.');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent-primary"></div>
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
            <div className='flex items-center space-x-4'>
            <img
                src={shopData.logo}
                alt="Shop Logo"
                className="w-20 h-20  rounded-full border-2 border-secondary object-cover"
              />
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Shop Profile</h1>
            </div>
            <p className="text-theme-text-secondary font-raleway">View and manage your shop information</p>
          </div>
          <div className="flex space-x-4">
            <div className={`px-4 py-2 rounded-full text-sm font-raleway font-medium ${shopData.status === 'active'
                ? 'bg-status-success-light text-status-success border border-status-success'
                : 'bg-status-error-light text-status-error border border-status-error'
              }`}>
              {shopData.status === 'active' ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Cover Image */}
       
          <div className="absolute bottom-6 left-6 flex items-end space-x-4">
           
            <div>
              <h2 className="text-2xl font-fredoka text-secondary">{shopData.name}</h2>
              <p className="text-secondary font-raleway">{shopData.zone.name}</p>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  <span className="text-secondary font-raleway">{shopData.rating}</span>
                  <span className="text-secondary font-raleway">({shopData.totalReviews} reviews)</span>
                </div>
              </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="admin-card rounded-2xl p-6">
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
              <FaStore className="mr-3 text-theme-accent-primary" />
              Basic Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-theme-text-secondary font-raleway mb-2">Shop Name</label>
                <p className="text-theme-text-primary font-raleway">{shopData.name}</p>
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway mb-2">Description</label>
                <p className="text-theme-text-primary font-raleway">{shopData.description}</p>
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway mb-2">Cuisine Type</label>
                <p className="text-theme-text-primary font-raleway">{shopData.cuisine}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="admin-card rounded-2xl p-6">
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
              <FaPhone className="mr-3 text-theme-accent-primary" />
              Contact Information
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <FaPhone className="text-theme-accent-primary" />
                <div>
                  <p className="text-theme-text-secondary font-raleway text-sm">Phone</p>
                  <p className="text-theme-text-primary font-raleway">{shopData.phone}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <FaEnvelope className="text-theme-accent-primary" />
                <div>
                  <p className="text-theme-text-secondary font-raleway text-sm">Email</p>
                  <p className="text-theme-text-primary font-raleway">{shopData.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <FaMapMarkerAlt className="text-theme-accent-primary" />
                <div>
                  <p className="text-theme-text-secondary font-raleway text-sm">Address</p>
                  <p className="text-theme-text-primary font-raleway">{shopData.address}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <FaClock className="text-theme-accent-primary" />
                <div>
                  <p className="text-theme-text-secondary font-raleway text-sm">Opening Hours</p>
                  <p className="text-theme-text-primary font-raleway">{shopData.openingHours}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media & Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Social Media */}
          <div className="admin-card rounded-2xl p-6">
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
              <FaGlobe className="mr-3 text-theme-accent-primary" />
              Social Media
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <FaGlobe className="text-theme-accent-primary" />
                <div>
                  <p className="text-theme-text-secondary font-raleway text-sm">Website</p>
                  <p className="text-theme-text-primary font-raleway">{shopData.socialMedia.website}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <FaInstagram className="text-theme-accent-primary" />
                <div>
                  <p className="text-theme-text-secondary font-raleway text-sm">Instagram</p>
                  <p className="text-theme-text-primary font-raleway">{shopData.socialMedia.instagram}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <FaFacebook className="text-theme-accent-primary" />
                <div>
                  <p className="text-theme-text-secondary font-raleway text-sm">Facebook</p>
                  <p className="text-theme-text-primary font-raleway">{shopData.socialMedia.facebook}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="admin-card rounded-2xl p-6">
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
              <FaRupeeSign className="mr-3 text-theme-accent-primary" />
              Payment Methods
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {shopData.paymentMethods.map((method, index) => (
                <div key={index} className="bg-theme-bg-hover rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-theme-accent-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <FaRupeeSign className="text-theme-accent-primary" />
                  </div>
                  <p className="text-theme-text-primary font-raleway text-sm">{method}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="flex justify-center pt-6">
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-theme-accent-primary hover:bg-theme-accent-hover text-theme-text-inverse px-8 py-3 rounded-xl font-raleway font-medium flex items-center space-x-3 transition-colors shadow-lg"
          >
            <FaEdit className="text-lg" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="admin-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-fredoka text-theme-text-primary">Edit Profile</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-theme-text-secondary hover:text-theme-text-primary p-2 rounded-lg hover:bg-theme-bg-hover transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                  {/* Image Uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-3">Shop Logo</label>
                      <ImageUpload
                        currentImage={formData.logo}
                        onImageChange={(imageUrl) => handleInputChange('logo', imageUrl)}
                        label="Upload Logo"
                        size="large"
                        shape="circle"
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-3">Cover Image</label>
                      <ImageUpload
                        currentImage={formData.coverImage}
                        onImageChange={(imageUrl) => handleInputChange('coverImage', imageUrl)}
                        label="Upload Cover"
                        size="large"
                        shape="rounded"
                      />
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Shop Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Cuisine Type</label>
                      <input
                        type="text"
                        value={formData.cuisine}
                        onChange={(e) => handleInputChange('cuisine', e.target.value)}
                        className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                      rows="4"
                      required
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                      rows="2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Opening Hours</label>
                    <input
                      type="text"
                      value={formData.openingHours}
                      onChange={(e) => handleInputChange('openingHours', e.target.value)}
                      className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                      placeholder="e.g., 10:00 AM - 11:00 PM"
                      required
                    />
                  </div>

                  {/* Social Media */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-fredoka text-theme-text-primary">Social Media</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Website</label>
                        <input
                          type="url"
                          value={formData.socialMedia?.website || ''}
                          onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, website: e.target.value })}
                          className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Instagram</label>
                        <input
                          type="text"
                          value={formData.socialMedia?.instagram || ''}
                          onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, instagram: e.target.value })}
                          className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                          placeholder="@username"
                        />
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Facebook</label>
                        <input
                          type="text"
                          value={formData.socialMedia?.facebook || ''}
                          onChange={(e) => handleInputChange('socialMedia', { ...formData.socialMedia, facebook: e.target.value })}
                          className="w-full bg-theme-bg-secondary border border-theme-border-primary rounded-lg px-4 py-3 text-theme-text-primary focus:outline-none focus:border-theme-accent-primary transition-colors autofill-protected"
                          placeholder="Page Name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-end space-x-4 pt-6 border-t border-theme-border-primary">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-3 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-lg font-raleway font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-theme-accent-primary hover:bg-theme-accent-hover text-theme-text-inverse px-8 py-3 rounded-lg font-raleway font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-text-inverse"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <FaSave />
                          <span>Save Changes</span>
                        </>
                      )}
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

export default ZoneShopProfile;
