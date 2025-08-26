import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaQrcode, 
  FaUser, 
  FaPhone, 
  FaEnvelope, 
  FaSpinner,
  FaArrowRight,
  FaStore,
  FaUtensils,
  FaMapMarkerAlt,
  FaClock,
  FaStar
} from 'react-icons/fa';
import ProfileOTPVerification from '../../components/common/ProfileOTPVerification';
import OTPService from '../../services/OTPService';
import LocalStorageService from '../../services/LocalStorageService';

const CustomerLogin = () => {
  const { restaurantSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [restaurantData, setRestaurantData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tableNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPhoneNumber, setOtpPhoneNumber] = useState('');

  useEffect(() => {
    // Fetch restaurant data from localStorage
    const fetchRestaurantData = async () => {
      setLoading(true);

      try {
        // Try to get restaurant data from localStorage
        const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
        const restaurant = restaurants.find(r =>
          r.name.toLowerCase().replace(/\s+/g, '-') === restaurantSlug ||
          r.slug === restaurantSlug
        );

        if (restaurant) {
          setRestaurantData({
            id: restaurant.id,
            name: restaurant.name,
            type: 'single',
            description: restaurant.description || 'Welcome to our restaurant',
            image: restaurant.coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
            rating: restaurant.rating || 0,
            totalReviews: restaurant.totalReviews || 0,
            address: restaurant.address || 'Address not available',
            phone: restaurant.ownerPhone || 'Phone not available',
            hours: restaurant.operatingHours ? 'Check operating hours' : 'Hours not set',
            isOpen: restaurant.status === 'active'
          });
        } else {
          // No restaurant found
          setRestaurantData(null);
        }
      } catch (error) {
        console.error('Error loading restaurant data:', error);
        setRestaurantData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [restaurantSlug]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setOtpPhoneNumber(formData.phone);
    setShowOtpModal(true);
  };

  const handleOtpVerified = (result) => {
    let customer = LocalStorageService.getCustomerByPhone(formData.phone);
    if (!customer) {
      customer = LocalStorageService.createCustomer({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      });
    }

    const customerSession = {
      sessionId: `cust_sess_${Date.now()}`,
      restaurantSlug: restaurantSlug,
      restaurantType: restaurantData.type,
      tableNumber: formData.tableNumber,
      customerInfo: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email
      },
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24*60*60*1000).toISOString() // 24 hours
    };

    sessionStorage.setItem('customerSession', JSON.stringify(customerSession));

    // Navigate to digital menu with userId
    navigate(`/customer/${restaurantSlug}/menu?userId=${customer.id}`);
  };

  const generateSessionId = () => {
    return 'cust_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black font-raleway font-medium">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ProfileOTPVerification
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
        phoneNumber={otpPhoneNumber}
        purpose="customer_login"
      />
      {/* Premium Background Elements */}
      

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Restaurant Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden"
        >
          <div className="h-64 bg-gradient-to-r from-black/80 to-black/60 relative">
            <img 
              src={restaurantData.image} 
              alt={restaurantData.name}
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
            
            <div className="relative z-10 h-full flex items-end p-6">
              <div className="text-white">
                <motion.h1
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-3xl font-bold mb-2"
                >
                  {restaurantData.name}
                </motion.h1>
                <motion.div
                  initial={{ x: -15, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex items-center space-x-4 text-sm"
                >
                  <div className="flex items-center space-x-1">
                    <FaStar className="text-yellow-400" />
                    <span>{restaurantData.rating}</span>
                    <span className="text-white/80">({restaurantData.totalReviews} reviews)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FaMapMarkerAlt className="text-white/80" />
                    <span className="text-white/80">{restaurantData.address}</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FaUser className="text-white text-2xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-black mb-2">Welcome!</h2>
                  <p className="text-gray-600">Please provide your details to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-2xl text-black focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 autofill-fix"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <FaPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-2xl text-black focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 autofill-fix"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-accent focus:ring-2 text-black focus:ring-accent/20 transition-all duration-300 autofill-fix"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                 
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-2xl font-semibold flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Menu</span>
                        <FaArrowRight />
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;