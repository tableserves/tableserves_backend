import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FaQrcode,
  FaTable,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSync
} from 'react-icons/fa';
import QRCode from 'qrcode';
import QrGeneratedCard from '../../../components/common/QrGeneratedCard';
import SingleRestaurantLayout from '../components/SingleRestaurantLayout';
import { RESTAURANT_PLANS } from '../../subscription/constants/plans';
import { usePlanRestrictions } from '../../subscription/components/PlanRestrictions';

const QRCodeGenerator = () => {
  const { user } = useSelector((state) => state.ui.auth);
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [loading, setLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [maxTables, setMaxTables] = useState(0);

  const { 
    subscription, 
    LimitReachedModal,
    PaymentModal,
    PaymentSuccessModal
  } = usePlanRestrictions();

  // Safely parse localStorage
  const safeJSONParse = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item && item !== 'undefined' ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const loadRestaurantData = useCallback(async () => {
    try {
      if (subscription?.maxTables) {
        setMaxTables(subscription.maxTables);
        return;
      }

      if (user?.restaurantId) {
        try {
          const { restaurantAPI } = await import('../../../shared/api/api');
          const response = await restaurantAPI.getRestaurant(user.restaurantId);

          if (response.success && response.data) {
            const restaurant = response.data;
            const maxTablesFromDB = restaurant.maxTables ||
                                    restaurant.subscriptionId?.limits?.maxTables ||
                                    subscription?.maxTables;

            if (maxTablesFromDB) {
              setMaxTables(maxTablesFromDB);
              return;
            }
          }
        } catch (error) {
          console.error('API fetch failed, falling back to local data');
        }
      }

      // LocalStorage Fallback
      let restaurants = safeJSONParse('tableserve_restaurants', []);
      if (restaurants.length === 0) {
        restaurants = safeJSONParse('restaurants', []);
      }
      
      const currentRestaurant = restaurants.find(r => r.id == user?.restaurantId);

      if (currentRestaurant) {
        const plan = currentRestaurant.subscriptionPlan || currentRestaurant.plan;
        
        if (plan?.toLowerCase() === 'premium') {
          const adminSetTables = currentRestaurant.maxTables;
          if (adminSetTables && adminSetTables > 0) {
            setMaxTables(adminSetTables);
            return;
          }
        } else {
          const planData = RESTAURANT_PLANS[plan?.toLowerCase()];
          if (planData && planData.maxTables) {
            setMaxTables(planData.maxTables);
            return;
          }
        }
      }

      // Final fallback to subscription object or free plan
      const sub = safeJSONParse('tableserve_subscription', {});
      setMaxTables(sub?.maxTables ?? RESTAURANT_PLANS.free.maxTables);

    } catch (error) {
      console.error('Error loading config:', error);
      setMaxTables(RESTAURANT_PLANS.free.maxTables);
    }
  }, [user?.restaurantId, subscription]);

  useEffect(() => {
    if (user?.restaurantId) loadRestaurantData();
  }, [user?.restaurantId, loadRestaurantData]);

  useEffect(() => {
    if (maxTables > 0 && user?.restaurantId) {
      const initialTableStates = safeJSONParse(`tables_states_${user.restaurantId}`, {});

      const newTables = Array.from({ length: maxTables }, (_, i) => {
        const tableId = i + 1;
        const savedState = initialTableStates[tableId] || {};
        return {
          id: tableId,
          number: tableId,
          status: 'active',
          qrGenerated: savedState.qrGenerated || false,
          lastGenerated: savedState.lastGenerated || null,
          sessionId: savedState.sessionId || null
        };
      });
      setTables(newTables);

      // Save structured compact state
      const compactStates = newTables.reduce((acc, table) => {
        acc[table.id] = {
          qrGenerated: table.qrGenerated,
          lastGenerated: table.lastGenerated,
          sessionId: table.sessionId
        };
        return acc;
      }, {});
      
      localStorage.setItem(`tables_states_${user.restaurantId}`, JSON.stringify(compactStates));
      
      // Load previously generated QR codes into memory
      const savedQRs = safeJSONParse(`qr_codes_${user.restaurantId}`, {});
      if (Object.keys(savedQRs).length > 0) {
        // We only save metadata in local storage to prevent quota limits. 
        // Actual base64 needs to be re-rendered on load if needed, or we just rely on new generations.
      }
    }
  }, [user?.restaurantId, maxTables]);

  const generateSecureToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

  const generateQRData = (tableNumber) => {
    const qrData = {
      restaurantId: user?.restaurantId,
      restaurantSlug: user?.restaurantSlug || user?.restaurantName?.toLowerCase().replace(/\s+/g, '-'),
      restaurantName: user?.restaurantName,
      restaurantType: user?.restaurantType || 'single',
      tableNumber,
      sessionId: generateSecureToken(),
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      version: '1.0'
    };

    const encodedData = btoa(JSON.stringify(qrData)).replace(/[+/=]/g, (m) => {
      return { '+': '-', '/': '_', '=': '' }[m];
    });

    const tableUrl = `${window.location.origin}/restaurant/${user?.restaurantId}/table/${tableNumber}/home`;

    return { data: qrData, encodedData, url: tableUrl };
  };

  const generateQRCode = async (tableNumber) => {
    try {
      const qrInfo = generateQRData(tableNumber);
      const qrCodeDataURL = await QRCode.toDataURL(qrInfo.url, {
        width: 400, // Higher resolution for printing
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      return { ...qrInfo, qrCodeImage: qrCodeDataURL };
    } catch (error) {
      return null;
    }
  };

  const handleGenerateSelected = async () => {
    if (selectedTables.length === 0) return;
    
    setLoading(true);
    setGenerationProgress(0);
    
    const newQrCodes = { ...qrCodes };
    const updatedTables = [...tables];
    let successCount = 0;

    try {
      // Process in sequence to prevent blocking the main thread and update progress
      for (let i = 0; i < selectedTables.length; i++) {
        const tableId = selectedTables[i];
        const table = tables.find(t => t.id === tableId);
        
        if (table) {
          const qrInfo = await generateQRCode(table.number);
          if (qrInfo) {
            newQrCodes[tableId] = qrInfo;
            successCount++;

            const tableIndex = updatedTables.findIndex(t => t.id === tableId);
            updatedTables[tableIndex] = {
              ...updatedTables[tableIndex],
              qrGenerated: true,
              lastGenerated: new Date().toISOString(),
              sessionId: qrInfo.data.sessionId
            };
          }
        }
        setGenerationProgress(Math.round(((i + 1) / selectedTables.length) * 100));
      }

      setQrCodes(newQrCodes);
      setTables(updatedTables);

      // Persist state
      const compactStates = updatedTables.reduce((acc, table) => {
        acc[table.id] = { qrGenerated: table.qrGenerated, lastGenerated: table.lastGenerated, sessionId: table.sessionId };
        return acc;
      }, {});
      localStorage.setItem(`tables_states_${user?.restaurantId}`, JSON.stringify(compactStates));

      // Save metadata without base64 images to prevent QuotaExceeded errors
      const metadataOnly = Object.keys(newQrCodes).reduce((acc, key) => {
        const { qrCodeImage, ...rest } = newQrCodes[key];
        acc[key] = rest;
        return acc;
      }, {});
      localStorage.setItem(`qr_codes_${user?.restaurantId}`, JSON.stringify(metadataOnly));

    } catch (error) {
      console.error('Generation error:', error);
      alert('An unexpected error occurred while generating QR codes.');
    } finally {
      setLoading(false);
      setSelectedTables([]);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  };

  const handleTableSelect = (tableId) => {
    setSelectedTables(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const copyToClipboard = async (url, tableId) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(Number(tableId)); // Ensure type match
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {}
  };

  const downloadQR = (qrInfo, tableNumber) => {
    const link = document.createElement('a');
    link.download = `${user?.restaurantSlug || 'restaurant'}-table-${tableNumber}.png`;
    link.href = qrInfo.qrCodeImage;
    link.click();
  };

  const getPlanDisplayText = () => {
    try {
      let restaurants = safeJSONParse('tableserve_restaurants', []);
      if (restaurants.length === 0) restaurants = safeJSONParse('restaurants', []);
      
      const currentRestaurant = restaurants.find(r => r.id == user?.restaurantId);
      if (currentRestaurant) {
        const plan = currentRestaurant.subscriptionPlan || currentRestaurant.plan;
        if (plan?.toLowerCase() === 'premium') return 'Premium Tier';
        const planData = RESTAURANT_PLANS[plan?.toLowerCase()];
        if (planData) return `${planData.label} Plan`;
      }
      return 'Active Plan';
    } catch {
      return 'Active Plan';
    }
  };

  return (
    <SingleRestaurantLayout>
      <div className="w-full h-full min-h-[calc(100vh-8rem)] flex flex-col space-y-6 pb-6">
        
        {/* Header Section */}
        <div className="bg-theme-bg-secondary p-6 rounded-xl border border-theme-border-primary shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight">QR Code</h1>
            <p className="text-sm text-theme-text-secondary mt-1">Generate unique scanning endpoints for dynamic table ordering.</p>
          </div>
          <div className="flex items-center gap-4 bg-theme-bg-secondary px-4 py-3 rounded-lg border border-theme-border-primary">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-theme-text-tertiary uppercase tracking-wider">{getPlanDisplayText()}</span>
              <span className="text-sm font-medium text-theme-text-primary">
                <span className="font-bold text-accent text-lg">{tables.length}</span> / {maxTables} Tables Active
              </span>
            </div>
            <FaTable className="text-theme-text-tertiary text-3xl ml-2" />
          </div>
        </div>

        {/* Table Selection Array */}
        <div className="bg-theme-bg-secondary rounded-xl border border-theme-border-primary shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-theme-border-primary bg-theme-bg-tertiary flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-theme-text-primary flex items-center gap-2">
              <FaQrcode className="text-theme-text-tertiary" /> Select Table to Generate
            </h2>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedTables(tables.map(t => t.id))}
                className="px-3 py-1.5 bg-theme-bg-secondary border border-theme-border-primary rounded-md text-xs font-semibold text-theme-text-secondary hover:bg-theme-bg-hover hover:text-accent transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedTables([])}
                disabled={selectedTables.length === 0}
                className="px-3 py-1.5 bg-theme-bg-secondary border border-theme-border-primary rounded-md text-xs font-semibold text-theme-text-secondary hover:bg-theme-bg-hover hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleGenerateSelected}
                disabled={selectedTables.length === 0 || loading}
                className="ml-2 px-4 py-1.5 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <><FaSync className="animate-spin" /> {generationProgress}%</>
                ) : (
                  `Generate (${selectedTables.length})`
                )}
              </button>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-6 overflow-visible">
              {tables.map(table => {
                const isSelected = selectedTables.includes(table.id);
                return (
                  <motion.button
                    key={table.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTableSelect(table.id)}
                    className={`
                      relative aspect-square rounded-xl border-2 transition-all flex items-center justify-center font-bold text-lg
                      ${isSelected
                        ? 'border-accent bg-accent/10 text-accent shadow-sm'
                        : 'border-theme-border-primary bg-theme-bg-secondary text-theme-text-tertiary hover:border-theme-border-secondary hover:bg-theme-bg-hover'
                      }
                    `}
                  >
                    {table.number}
                    {table.qrGenerated && (
                      <div className="absolute -top-2 -right-2 z-10 bg-status-success text-white w-5 h-5 rounded-full shadow-md border-2 border-white flex items-center justify-center">
                        <FaCheckCircle className="text-[10px]" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Output Matrix */}
        <AnimatePresence>
          {Object.keys(qrCodes).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-theme-bg-secondary rounded-xl border border-theme-border-primary shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-theme-text-primary">Rendered Codes</h2>
                <span className="text-xs font-medium text-status-success bg-status-success-light px-2 py-1 rounded-md border border-status-success/20">
                  Ready for print
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Object.entries(qrCodes).map(([tableId, qrInfo]) => {
                  const table = tables.find(t => t.id === parseInt(tableId));
                  if (!table) return null;

                  return (
                    <motion.div
                      key={tableId}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative rounded-xl border border-theme-border-primary bg-theme-bg-tertiary p-4 hover:border-accent/30 hover:shadow-md transition-all"
                    >
                      {/* Assuming QrGeneratedCard handles its own internal layout, passing props as requested */}
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
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      
      {/* Plan Restriction Modals */}
      {LimitReachedModal}
      {PaymentModal}
      {PaymentSuccessModal}
    </SingleRestaurantLayout>
  );
};

export default QRCodeGenerator;