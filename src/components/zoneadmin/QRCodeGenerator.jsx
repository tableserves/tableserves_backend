import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import LocalStorageService from '../../services/LocalStorageService';
import {
  FaQrcode,
  FaDownload,
  FaTable,
  FaPrint,
  FaCopy,
  FaCheck,
  FaStore
} from 'react-icons/fa';
import QRCode from 'qrcode';

import QrGeneratedCard from '../common/QrGeneratedCard';
import ZoneAdminLayout from './ZoneAdminLayout';

const ZoneAdminQRCodeGenerator = () => {
  const { user } = useSelector((state) => state.ui.auth);
  const { zoneId } = useParams();
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [maxTables, setMaxTables] = useState(0); // Set by subscription plan
  const [zoneData, setZoneData] = useState(null);

  useEffect(() => {
    // Load plan-based table limit from subscription data
    const loadZoneData = () => {
      try {
        const zone = LocalStorageService.getZoneById(zoneId);
        if (zone) {
          setZoneData(zone);
        }

        // Load subscription data for table limits (consistent with vendors)
        const subscriptionData = (() => {
          try {
            const raw = localStorage.getItem('tableserve_subscription');
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })();

        const tableLimit = subscriptionData?.maxTables || zone?.maxTables || 0;
        setMaxTables(tableLimit);

        console.log('Table limit check:', {
          subscriptionLimit: subscriptionData?.maxTables,
          zoneLimit: zone?.maxTables,
          finalLimit: tableLimit
        });
      } catch (error) {
        console.error("Error loading zone data:", error);
        setMaxTables(0);
      }
    };

    if (zoneId) {
      loadZoneData();
    }
  }, [zoneId]);

  useEffect(() => {
    // Load existing zone tables or create default ones based on maxTables limit
    if (maxTables > 0 && zoneId) {
      const savedTables = localStorage.getItem(`zone_tables_${zoneId}`);
      let tablesToSet = [];
      if (savedTables) {
        const parsedTables = JSON.parse(savedTables);
        if (parsedTables.length < maxTables) {
          // If saved tables are less than maxTables, add more tables
          const additionalTables = Array.from({ length: maxTables - parsedTables.length }, (_, i) => ({
            id: parsedTables.length + i + 1,
            number: parsedTables.length + i + 1,
            status: 'active',
            qrGenerated: false,
            lastGenerated: null,
            sessionId: null,
            location: `Table ${parsedTables.length + i + 1}`
          }));
          tablesToSet = [...parsedTables, ...additionalTables];
        } else {
          // If saved tables are more than or equal to maxTables, slice the array
          tablesToSet = parsedTables.slice(0, maxTables);
        }
      } else {
        // Create default zone tables up to maxTables limit
        tablesToSet = Array.from({ length: maxTables }, (_, i) => ({
          id: i + 1,
          number: i + 1,
          status: 'active',
          qrGenerated: false,
          lastGenerated: null,
          sessionId: null,
          location: `Table ${i + 1}` // Can be customized later
        }));
      }
      setTables(tablesToSet);
      localStorage.setItem(`zone_tables_${zoneId}`, JSON.stringify(tablesToSet));
    }
  }, [zoneId, maxTables]);

  const generateSecureToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const generateQRData = (tableNumber) => {
    const qrData = {
      zoneId,
      zoneName: user?.zoneName,
      tableNumber,
      sessionId: generateSecureToken(),
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      version: '1.0'
    };

    // Generate zone-wide table URL (customers choose shop after scanning)
    const tableUrl = `${window.location.origin}/tableserve/zone/${zoneId}/table/${tableNumber}/home`;

    return {
      data: qrData,
      url: tableUrl
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
        },
        errorCorrectionLevel: 'M'
      });

      return {
        ...qrInfo,
        qrCodeImage: qrCodeDataURL
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  const handleGenerateSelected = async () => {
    if (selectedTables.length === 0) return;

    setLoading(true);
    const newQrCodes = { ...qrCodes };

    try {
      for (const tableNumber of selectedTables) {
        const qrInfo = await generateQRCode(tableNumber);
        newQrCodes[tableNumber] = qrInfo;

        // Update table status
        setTables(prev => prev.map(table =>
          table.number === tableNumber
            ? { ...table, qrGenerated: true, lastGenerated: new Date().toISOString() }
            : table
        ));
      }

      setQrCodes(newQrCodes);

      // Save updated tables
      const updatedTables = tables.map(table =>
        selectedTables.includes(table.number)
          ? { ...table, qrGenerated: true, lastGenerated: new Date().toISOString() }
          : table
      );
      localStorage.setItem(`zone_tables_${zoneId}`, JSON.stringify(updatedTables));

      // Update main zone data for Super Admin dashboard
      try {
        const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        const zoneIndex = zones.findIndex(z => z.id == zoneId);

        if (zoneIndex !== -1) {
          // Update QR generation status and table count in main zone data
          zones[zoneIndex] = {
            ...zones[zoneIndex],
            tables: updatedTables.length,
            qrGenerated: updatedTables.filter(t => t.qrGenerated).length,
            lastQrGenerated: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          localStorage.setItem('tableserve_zones', JSON.stringify(zones));
          console.log('Updated main zone data for Super Admin dashboard');
        }
      } catch (error) {
        console.error('Error updating main zone data:', error);
      }

    } catch (error) {
      console.error('Error generating QR codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableNumber) => {
    setSelectedTables(prev =>
      prev.includes(tableNumber)
        ? prev.filter(t => t !== tableNumber)
        : [...prev, tableNumber]
    );
  };

  const handleSelectAll = () => {
    setSelectedTables(tables.map(table => table.number));
  };

  const handleDeselectAll = () => {
    setSelectedTables([]);
  };

  const copyToClipboard = async (url, tableNumber) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(tableNumber);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const downloadQRCode = (qrCodeImage, tableNumber) => {
    const link = document.createElement('a');
    link.download = `zone-${zoneId}-table-${tableNumber}-qr.png`;
    link.href = qrCodeImage;
    link.click();
  };



  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };


  return (
    <ZoneAdminLayout>
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
                Table Limit: {tables.length} / {maxTables} (Plan)
              </p>
            </div>

          </div>
        </div>



        {/* Table Selection */}
        <div className="admin-card rounded-lg p-6 mb-6">
          <h2 className="text-lg font-fredoka text-theme-text-primary mb-4 flex items-center">
            <FaTable className="mr-2" />
            Select Tables for QR Generation
          </h2>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 mb-4 max-h-96 overflow-y-auto">
            {tables.map(table => (
              <motion.button
                key={table.number}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTableSelect(table.number)}
                className={`
                relative p-2 rounded-lg border-2 transition-all font-raleway font-semibold text-sm
                ${selectedTables.includes(table.number)
                    ? 'border-accent bg-accent text-white'
                    : 'border-theme-border m-1 bg-theme-surface text-secondary hover:border-accent'
                  }
                ${table.qrGenerated ? '' : ''}
              `}
              >
                {table.number}

              </motion.button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedTables(tables.map(t => t.number))}
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
              Generated Zone QR Codes
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(qrCodes).map(([tableNumber, qrInfo]) => (
                <motion.div
                  key={tableNumber}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-theme-border rounded-lg p-4 bg-theme-surface"
                >
                  <QrGeneratedCard
                    title={`Table ${tableNumber}`}
                    imgSrc={qrInfo.qrCodeImage}
                    url={qrInfo.url}
                    copied={copiedUrl === parseInt(tableNumber)}
                    onCopy={() => copyToClipboard(qrInfo.url, tableNumber)}
                    onDownload={() => downloadQRCode(qrInfo.qrCodeImage, tableNumber)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneAdminQRCodeGenerator;
