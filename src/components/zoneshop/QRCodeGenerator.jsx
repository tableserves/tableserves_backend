import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  FaQrcode,
  FaDownload,
  FaTable,
  FaPrint,
  FaCopy,
  FaCheck
} from 'react-icons/fa';
import QRCode from 'qrcode';

const ZoneShopQRCodeGenerator = () => {
  const { user } = useSelector((state) => state.ui.auth);
  const { zoneId, shopId } = useParams();
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);

  useEffect(() => {
    // Load existing tables or create default ones for this shop
    const savedTables = localStorage.getItem(`shop_tables_${zoneId}_${shopId}`);
    if (savedTables) {
      setTables(JSON.parse(savedTables));
    } else {
      // Create default tables (1-15 for shops)
      const defaultTables = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        number: i + 1,
        status: 'active',
        qrGenerated: false,
        lastGenerated: null,
        sessionId: null
      }));
      setTables(defaultTables);
      localStorage.setItem(`shop_tables_${zoneId}_${shopId}`, JSON.stringify(defaultTables));
    }
  }, [zoneId, shopId]);

  const generateSecureToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const generateQRData = (tableNumber) => {
    const qrData = {
      zoneId,
      shopId,
      shopName: user?.shopName,
      tableNumber,
      sessionId: generateSecureToken(),
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      version: '1.0'
    };

    // Generate table-based URL for zone shop
    const tableUrl = `${window.location.origin}/tableserve/zone/${zoneId}/shop/${shopId}/table/${tableNumber}/menu`;

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
      localStorage.setItem(`shop_tables_${zoneId}_${shopId}`, JSON.stringify(updatedTables));

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
    link.download = `shop-${shopId}-table-${tableNumber}-qr.png`;
    link.href = qrCodeImage;
    link.click();
  };

  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleSelectAll = () => {
    setSelectedTables(tables.map(table => table.number));
  };

  const handleDeselectAll = () => {
    setSelectedTables([]);
  };



  return (
    <div className="p-6 ">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-fredoka text-theme-text-primary mb-2">
              QR Code Generator - Shop Tables
            </h1>
            <p className="text-theme-text-secondary font-raleway">
              Generate QR codes for your shop tables. Customers can scan to access the menu directly.
            </p>
          </div>

        </div>
      </div>

      {/* Table Selection */}
      <div className="admin-card rounded-lg p-6 mb-6">
        <h2 className="text-lg font-fredoka text-theme-text-primary mb-4 flex items-center">
          <FaTable className="mr-2" />
          Select Tables
        </h2>

        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 mb-4">
          {tables.map(table => (
            <motion.button
              key={table.number}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTableSelect(table.number)}
              className={`
                relative p-3 rounded-lg border-2 transition-all font-raleway font-semibold
                ${selectedTables.includes(table.number)
                  ? 'border-accent bg-accent text-white'
                  : 'border-theme-border bg-theme-surface text-theme-text-primary hover:border-accent'
                }
                ${table.qrGenerated ? 'ring-2 ring-green-500 ring-opacity-50' : ''}
              `}
            >
              {table.number}
              {table.qrGenerated && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
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
            Generated QR Codes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(qrCodes).map(([tableNumber, qrInfo]) => (
              <motion.div
                key={tableNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-theme-border rounded-lg p-4 bg-theme-surface"
              >
                <div className="text-center mb-3">
                  <h3 className="font-fredoka text-theme-text-primary text-lg">
                    Table {tableNumber}
                  </h3>
                </div>

                <div className="flex justify-center mb-3">
                  <img
                    src={qrInfo.qrCodeImage}
                    alt={`QR Code for Table ${tableNumber}`}
                    className="w-48 h-48 border border-theme-border rounded"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-theme-text-secondary font-raleway break-all">
                    {qrInfo.url}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(qrInfo.url, tableNumber)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center justify-center"
                    >
                      {copiedUrl === parseInt(tableNumber) ? <FaCheck className="mr-1" /> : <FaCopy className="mr-1" />}
                      {copiedUrl === parseInt(tableNumber) ? 'Copied!' : 'Copy URL'}
                    </button>
                    <button
                      onClick={() => downloadQRCode(qrInfo.qrCodeImage, tableNumber)}
                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors flex items-center justify-center"
                    >
                      <FaDownload className="mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneShopQRCodeGenerator;
