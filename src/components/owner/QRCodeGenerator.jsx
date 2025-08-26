import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FaQrcode,
  FaTable,
  FaDownload,
  FaCopy,
  FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa';
import QRCode from 'qrcode';
import QrGeneratedCard from '../common/QrGeneratedCard';
import SingleRestaurantLayout from './SingleRestaurantLayout';
import { RESTAURANT_PLANS } from '../../constants/plans';
import { usePlanRestrictions } from '../subscription/PlanRestrictions';

const QRCodeGenerator = () => {
  const { user } = useSelector((state) => state.ui.auth);
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [maxTables, setMaxTables] = useState(0); // Set by subscription plan

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


  useEffect(() => {
    // Load table limit based on restaurant plan type
    const loadRestaurantData = () => {
      try {
        // First try to get limit from subscription data (most reliable)
        if (subscription?.maxTables) {
          console.log('Using subscription maxTables:', subscription.maxTables);
          setMaxTables(subscription.maxTables);
          return;
        }

        // Get restaurant-specific data - try both possible keys
        let restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
        if (restaurants.length === 0) {
          restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        }
        const currentRestaurant = restaurants.find(r => r.id == user?.restaurantId);

        console.log('Current restaurant data:', currentRestaurant);
        console.log('User restaurant ID:', user?.restaurantId);

        if (currentRestaurant) {
          const plan = currentRestaurant.subscriptionPlan || currentRestaurant.plan;
          console.log('Restaurant plan:', plan);
          console.log('Restaurant maxTables:', currentRestaurant.maxTables);

          // For premium restaurants: use custom table limit set by super admin
          if (plan?.toLowerCase() === 'premium') {
            const adminSetTables = currentRestaurant.maxTables;
            console.log('Premium restaurant - admin set tables:', adminSetTables);
            if (adminSetTables && adminSetTables > 0) {
              setMaxTables(adminSetTables);
              console.log('Set maxTables to:', adminSetTables);
              return;
            }
          } else {
            // For standard plans (free, basic, advanced): use plan limits
            const planData = RESTAURANT_PLANS[plan?.toLowerCase()];
            if (planData && planData.maxTables) {
              console.log('Standard plan - using plan limit:', planData.maxTables);
              setMaxTables(planData.maxTables);
              return;
            }
          }
        }

        // Fallback to subscription data if restaurant data not found
        console.log('Using fallback subscription data');
        try {
          const sub = JSON.parse(localStorage.getItem('tableserve_subscription') || '{}');
          const planMax = sub?.maxTables ?? RESTAURANT_PLANS.free.maxTables;
          console.log('Fallback subscription maxTables:', planMax);
          setMaxTables(planMax);
        } catch (error) {
          console.warn('Error parsing subscription data:', error);
          setMaxTables(RESTAURANT_PLANS.free.maxTables); // Ultimate fallback to free plan
        }
      } catch (error) {
        console.error('Error loading restaurant data:', error);
        setMaxTables(RESTAURANT_PLANS.free.maxTables); // Default to free plan limit
      }
    };

    if (user?.restaurantId) {
      loadRestaurantData();
    }
  }, [user?.restaurantId, subscription]);

  useEffect(() => {
    if (maxTables > 0 && user?.restaurantId) {
      const savedTableStates = localStorage.getItem(`tables_states_${user?.restaurantId}`); // New key
      let initialTableStates = {};
      if (savedTableStates) {
        initialTableStates = JSON.parse(savedTableStates);
      }

      const newTables = Array.from({ length: maxTables }, (_, i) => {
        const tableId = i + 1;
        const savedState = initialTableStates[tableId] || {};
        return {
          id: tableId,
          number: tableId,
          status: 'active', // Default status
          qrGenerated: savedState.qrGenerated || false,
          lastGenerated: savedState.lastGenerated || null,
          sessionId: savedState.sessionId || null
        };
      });
      setTables(newTables);

      // Save the initial compact state
      const compactStates = {};
      newTables.forEach(table => {
        compactStates[table.id] = {
          qrGenerated: table.qrGenerated,
          lastGenerated: table.lastGenerated,
          sessionId: table.sessionId
        };
      });
      localStorage.setItem(`tables_states_${user?.restaurantId}`, JSON.stringify(compactStates));
    }
  }, [user?.restaurantId, maxTables]);

  const generateSecureToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const generateQRData = (tableNumber) => {
    const qrData = {
      restaurantId: user?.restaurantId,
      restaurantSlug: user?.restaurantSlug || user?.restaurantName?.toLowerCase().replace(/\s+/g, '-'),
      restaurantName: user?.restaurantName,
      restaurantType: user?.restaurantType || 'single',
      tableNumber,
      sessionId: generateSecureToken(),
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      version: '1.0'
    };

    // Encode data (not for security, just for clean URLs)
    const encodedData = btoa(JSON.stringify(qrData)).replace(/[+/=]/g, (m) => {
      return { '+': '-', '/': '_', '=': '' }[m];
    });

    // Generate table-based URL for restaurant
    const tableUrl = `${window.location.origin}/tableserve/restaurant/${user?.restaurantId}/table/${tableNumber}/home`;

    return {
      data: qrData,
      encodedData,
      url: tableUrl,
      scanUrl: `${window.location.origin}/scan/${encodedData}` // Keep legacy support
    };
  };

  const generateQRCode = async (tableNumber) => {
    try {
      const qrInfo = generateQRData(tableNumber);

      // Generate QR code image
      const qrCodeDataURL = await QRCode.toDataURL(qrInfo.url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        ...qrInfo,
        qrCodeImage: qrCodeDataURL
      };
    } catch (error) {
      console.error('QR generation error:', error);
      return null;
    }
  };

  const handleGenerateSelected = async () => {
    if (selectedTables.length === 0) {
      alert('Please select tables to generate QR codes for.');
      return;
    }
    
    console.log('QR Generation - Checking subscription:', subscription);
    
    // Allow QR generation for all plans - this is a basic feature
    // Free plan should definitely have QR generation capability
    const hasQRAccess = !subscription || 
                       subscription.features?.qrGeneration === true || 
                       subscription.key === 'free' || 
                       subscription.key === 'basic' || 
                       subscription.key === 'advanced' || 
                       subscription.key === 'premium';
    
    console.log('QR Generation - Access check:', {
      hasQRAccess,
      subscriptionKey: subscription?.key,
      qrGenerationFeature: subscription?.features?.qrGeneration,
      features: subscription?.features
    });
    
    if (!hasQRAccess) {
      alert('QR generation is not available for your current plan. Please upgrade your plan.');
      return;
    }

    // Note: We restrict number of TABLES based on plan, not QR generation
    // Users can generate QR codes unlimited times for their available tables

    setLoading(true);
    const newQrCodes = { ...qrCodes };
    const updatedTables = [...tables];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const tableId of selectedTables) {
        const table = tables.find(t => t.id === tableId);
        if (table) {
          try {
            const qrInfo = await generateQRCode(table.number);
            if (qrInfo) {
              newQrCodes[tableId] = qrInfo;
              successCount++;

              // Update table info
              const tableIndex = updatedTables.findIndex(t => t.id === tableId);
              if (tableIndex !== -1) {
                updatedTables[tableIndex] = {
                  ...updatedTables[tableIndex],
                  qrGenerated: true,
                  lastGenerated: new Date().toISOString(),
                  sessionId: qrInfo.data.sessionId
                };
              }
            } else {
              errorCount++;
              console.error(`Failed to generate QR code for table ${table.number}`);
            }
          } catch (error) {
            errorCount++;
            console.error(`Error generating QR code for table ${table.number}:`, error);
          }
        }
      }

      // Update state with generated QR codes
      setQrCodes(newQrCodes);
      setTables(updatedTables);

      // Save the compact state of tables
      const compactStates = {};
      updatedTables.forEach(table => {
        compactStates[table.id] = {
          qrGenerated: table.qrGenerated,
          lastGenerated: table.lastGenerated,
          sessionId: table.sessionId
        };
      });
      localStorage.setItem(`tables_states_${user?.restaurantId}`, JSON.stringify(compactStates));

      // Create a copy of newQrCodes to remove qrCodeImage before saving to localStorage
      const newQrCodesWithoutImages = {};
      for (const tableId in newQrCodes) {
        const { qrCodeImage, ...rest } = newQrCodes[tableId];
        newQrCodesWithoutImages[tableId] = rest;
      }
      localStorage.setItem(`qr_codes_${user?.restaurantId}`, JSON.stringify(newQrCodesWithoutImages));

      // Update main restaurant data for Super Admin dashboard
      try {
        const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
        const restaurantIndex = restaurants.findIndex(r => r.id == user?.restaurantId);

        if (restaurantIndex !== -1) {
          restaurants[restaurantIndex] = {
            ...restaurants[restaurantIndex],
            tables: updatedTables.length,
            qrGenerated: updatedTables.filter(t => t.qrGenerated).length,
            lastQrGenerated: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem('tableserve_restaurants', JSON.stringify(restaurants));
        }
      } catch (error) {
        console.error('Error updating main restaurant data:', error);
      }

      // Show error feedback only (success is silent)
      if (successCount > 0 && errorCount > 0) {
        alert(`Generated ${successCount} QR codes successfully, but ${errorCount} failed. Please try again for the failed ones.`);
      } else if (errorCount > 0) {
        alert(`Failed to generate QR codes. Please check your internet connection and try again.`);
      }

    } catch (error) {
      console.error('Unexpected error during QR generation:', error);
      alert('An unexpected error occurred while generating QR codes. Please try again.');
    } finally {
      setLoading(false);
      setSelectedTables([]);
    }
  };

  const handleTableSelect = (tableId) => {
    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const copyToClipboard = async (url, tableId) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(tableId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const downloadQR = (qrInfo, tableNumber) => {
    const link = document.createElement('a');
    link.download = `table-${tableNumber}-qr.png`;
    link.href = qrInfo.qrCodeImage;
    link.click();
  };

  const getPlanDisplayText = () => {
    try {
      let restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
      if (restaurants.length === 0) {
        restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
      }
      const currentRestaurant = restaurants.find(r => r.id == user?.restaurantId);

      if (currentRestaurant) {
        const plan = currentRestaurant.subscriptionPlan || currentRestaurant.plan;
        if (plan?.toLowerCase() === 'premium') {
          return '(Premium - Custom)';
        } else {
          const planData = RESTAURANT_PLANS[plan?.toLowerCase()];
          if (planData) {
            return `(${planData.label} Plan)`;
          }
        }
      }
      return '(Plan Limit)';
    } catch {
      return '(Plan Limit)';
    }
  };





  return (
    <SingleRestaurantLayout>
      <div className="p-6 pt-12 mt-4 rounded-2xl admin-card">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-fredoka text-theme-text-primary mb-1">
                QR Code Generator
              </h1>
              <p className="text-theme-text-secondary font-raleway">
                Generate QR codes for your tables. Customers scan to access your menu.
              </p>
              <p className="text-theme-text-tertiary font-raleway text-sm mt-1">
                Available Tables: {tables.length} / {maxTables} {getPlanDisplayText()}
              </p>
              <p className="text-theme-text-tertiary font-raleway text-xs mt-1 italic">
                Note: You can generate QR codes unlimited times for each table
              </p>
            </div>
          </div>
        </div>

        {/* QR Generation with Feature Restriction */}
        <div className="admin-card rounded-lg p-6 mb-6">
          <h2 className="text-lg font-fredoka text-theme-text-primary mb-4 flex items-center">
            <FaTable className="mr-2" />
            Your Available Tables ({tables.length}/{maxTables})
          </h2>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 mb-4 max-h-96 overflow-y-auto">
              {tables.map(table => (
                <motion.button
                  key={table.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTableSelect(table.id)}
                  className={`
                    relative p-2 rounded-lg border-2 transition-all font-raleway font-semibold text-sm
                    ${selectedTables.includes(table.id)
                      ? 'border-accent bg-accent text-white'
                      : 'border-theme-border m-1 bg-theme-surface text-secondary hover:border-accent'
                    }
                    ${table.qrGenerated ? '' : ''}
                  `}
                >
                  {table.number}
                  {table.qrGenerated && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </motion.button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedTables(tables.map(t => t.id))}
                className="px-4 py-2 bg-theme-surface border border-theme-border rounded-lg text-theme-text-primary hover:bg-accent hover:text-white transition-colors font-raleway"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedTables([])}
                className="px-4 py-2 bg-theme-surface border border-theme-border rounded-lg text-theme-text-primary hover:bg-red-500 hover:text-white transition-colors font-raleway"
              >
                Clear Selection
              </button>
              <button
                onClick={handleGenerateSelected}
                disabled={selectedTables.length === 0 || loading}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-raleway font-semibold flex items-center"
              >
                <FaQrcode className="mr-2" />
                {loading ? 'Generating...' : `Generate QR (${selectedTables.length})`}
              </button>
            </div>
        </div>

        {/* Generated QR Codes */}
        {Object.keys(qrCodes).length > 0 && (
          <div className="admin-card rounded-lg p-6">
            <h2 className="text-lg font-fredoka text-theme-text-primary mb-4">
              Generated Restaurant QR Codes
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(qrCodes).map(([tableId, qrInfo]) => {
                const table = tables.find(t => t.id === parseInt(tableId));
                if (!table) return null;

                return (
                  <motion.div
                    key={tableId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-theme-border rounded-lg p-4 bg-theme-surface"
                  >
                    <QrGeneratedCard
                      title={`Table ${table.number}`}
                      imgSrc={qrInfo.qrCodeImage}
                      url={qrInfo.url}
                      copied={copiedUrl === parseInt(tableId)}
                      onCopy={() => copyToClipboard(qrInfo.url, tableId)}
                      onDownload={() => downloadQR(qrInfo, table.number)}
                    />
                  </motion.div>
                );
              })}
            </div>
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

export default QRCodeGenerator;
