import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  FaQrcode,
  FaDownload,
  FaTable,
  FaSync,
  FaCheckCircle,
  FaInfoCircle
} from 'react-icons/fa';
import QRCode from 'qrcode';

import QrGeneratedCard from '../../../components/common/QrGeneratedCard';
import ZoneAdminLayout from './ZoneAdminLayout';
import { fetchCurrentSubscription, fetchSubscriptionLimits, fetchCurrentCounts } from '../../../store/slices/subscriptionSlice';
import RealtimeDatabaseService from '../../../services/RealtimeDatabaseService';

const ZoneAdminQRCodeGenerator = () => {
  const dispatch = useDispatch();
  const { zoneId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);
  const { current: subscription, limits: subscriptionLimits } = useSelector((state) => state.subscription);
  
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [loading, setLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [maxTables, setMaxTables] = useState(0);

  // Fetch Subscription Data
  useEffect(() => {
    dispatch(fetchCurrentSubscription());
    dispatch(fetchSubscriptionLimits());
    dispatch(fetchCurrentCounts());
  }, [dispatch]);

  // Load Zone & Calculate Limits
  useEffect(() => {
    const initZone = async () => {
      try {
        const zone = await RealtimeDatabaseService.getZone(zoneId);
        const limit = subscriptionLimits?.maxTables || subscription?.maxTables || zone?.maxTables || 0;
        setMaxTables(limit);

        if (limit > 0) {
          const generatedTables = Array.from({ length: limit }, (_, i) => ({
            id: i + 1,
            number: i + 1,
            qrGenerated: false,
            lastGenerated: null,
          }));
          setTables(generatedTables);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };
    if (zoneId) initZone();
  }, [zoneId, subscription, subscriptionLimits]);

  const generateQRCode = async (tableNumber) => {
    const tableUrl = `${window.location.origin}/zone/${zoneId}/table/${tableNumber}/home`;
    try {
      const qrCodeDataURL = await QRCode.toDataURL(tableUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H'
      });
      return { url: tableUrl, qrCodeImage: qrCodeDataURL };
    } catch (err) {
      return null;
    }
  };

  const handleGenerateSelected = async () => {
    if (selectedTables.length === 0) return;
    setLoading(true);
    setGenerationProgress(0);
    
    const newQrCodes = { ...qrCodes };
    const updatedTables = [...tables];

    for (let i = 0; i < selectedTables.length; i++) {
      const tableNum = selectedTables[i];
      const result = await generateQRCode(tableNum);
      
      if (result) {
        newQrCodes[tableNum] = result;
        const index = updatedTables.findIndex(t => t.number === tableNum);
        updatedTables[index] = { 
          ...updatedTables[index], 
          qrGenerated: true, 
          lastGenerated: new Date().toISOString() 
        };
      }
      setGenerationProgress(Math.round(((i + 1) / selectedTables.length) * 100));
    }

    setQrCodes(newQrCodes);
    setTables(updatedTables);
    setLoading(false);
    setSelectedTables([]);
    setTimeout(() => setGenerationProgress(0), 1000);
  };

  const toggleTable = (num) => {
    setSelectedTables(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  return (
    <ZoneAdminLayout>
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Header Card */}
        <div className="bg-theme-surface p-8 rounded-2xl border border-theme-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-fredoka text-theme-text-primary flex items-center gap-3">
              <FaQrcode className="text-accent" /> QR Management
            </h1>
            <p className="text-theme-text-secondary font-raleway">
              Provision and manage secure access endpoints for your zone tables.
            </p>
          </div>
          
          <div className="bg-theme-bg-tertiary px-6 py-4 rounded-xl border border-theme-border flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest">System Capacity</p>
              <p className="text-xl font-fredoka text-theme-text-primary">
                <span className="text-accent">{tables.filter(t => t.qrGenerated).length}</span>
                <span className="mx-1 text-theme-text-tertiary">/</span>
                {maxTables} <span className="text-sm text-theme-text-secondary">Tables</span>
              </p>
            </div>
            <div className="h-10 w-[1px] bg-theme-border mx-2" />
            <FaTable className="text-theme-text-tertiary text-2xl" />
          </div>
        </div>

        {/* Selection Grid */}
        <div className="bg-theme-surface rounded-2xl border border-theme-border overflow-hidden shadow-sm">
          <div className="px-6 py-5 bg-theme-bg-tertiary border-b border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-theme-text-primary flex items-center gap-2">
              <FaQrcode className="text-theme-text-tertiary" />
              <span>Select Table to Generate</span>
            </h2>
            
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setSelectedTables(tables.map(t => t.number))}
                className="px-3 py-1.5 bg-theme-bg-secondary border border-theme-border rounded-md text-xs font-semibold text-theme-text-secondary hover:bg-theme-bg-hover hover:text-accent transition-colors"
              >
                Select All
              </button>
              <button 
                onClick={() => setSelectedTables([])}
                disabled={selectedTables.length === 0}
                className="px-3 py-1.5 bg-theme-bg-secondary border border-theme-border rounded-md text-xs font-semibold text-theme-text-secondary hover:bg-theme-bg-hover hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleGenerateSelected}
                disabled={selectedTables.length === 0 || loading}
                className="ml-2 px-4 py-1.5 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <FaSync className="animate-spin" />
                    <span>{generationProgress}%</span>
                  </>
                ) : (
                  <span>Generate ({selectedTables.length})</span>
                )}
              </button>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-6 overflow-visible">
              {tables.map(table => {
                const isSelected = selectedTables.includes(table.number);
                return (
                  <motion.button
                    key={table.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleTable(table.number)}
                    className={`
                      relative aspect-square rounded-xl border-2 transition-all flex items-center justify-center font-fredoka text-lg
                      ${isSelected
                        ? 'border-accent bg-accent/10 text-accent shadow-sm'
                        : 'border-theme-border bg-theme-bg-tertiary text-theme-text-tertiary hover:border-theme-border-secondary'
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

        {/* Results Matrix */}
        <AnimatePresence>
          {Object.keys(qrCodes).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-theme-border" />
                <h2 className="text-sm font-bold text-theme-text-tertiary uppercase tracking-widest">Generated Results</h2>
                <div className="h-[1px] flex-1 bg-theme-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Object.entries(qrCodes).map(([num, info]) => (
                  <motion.div
                    key={num}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-1 rounded-2xl bg-gradient-to-b from-theme-border to-transparent"
                  >
                    <div className="bg-theme-surface rounded-[calc(1rem-1px)] p-2">
                      <QrGeneratedCard
                        title={`Table ${num}`}
                        imgSrc={info.qrCodeImage}
                        url={info.url}
                        copied={copiedUrl === parseInt(num)}
                        onCopy={() => {
                          navigator.clipboard.writeText(info.url);
                          setCopiedUrl(parseInt(num));
                          setTimeout(() => setCopiedUrl(null), 2000);
                        }}
                        onDownload={() => {
                          const link = document.createElement('a');
                          link.download = `Table-${num}-QR.png`;
                          link.href = info.qrCodeImage;
                          link.click();
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneAdminQRCodeGenerator;