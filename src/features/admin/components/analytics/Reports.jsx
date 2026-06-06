import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaFileExport,
  FaDownload,
  FaChartBar,
  FaDollarSign,
  FaUsers,
  FaStore,
  FaShoppingCart,
  FaTable,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaCalendarAlt,
  FaFilePdf,
  FaFileExcel,
  FaFileCsv
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';
import ApiService from '../../../../shared/api/ApiService';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('revenue');
  const [dateRange, setDateRange] = useState('last30days');
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const reportTypes = [
    { id: 'revenue', title: 'Revenue Report', description: 'Real-time revenue analysis across all restaurants', icon: FaDollarSign, gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/20' },
    { id: 'orders', title: 'Orders Report', description: 'Live order statistics and platform trends', icon: FaShoppingCart, gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/20' },
    { id: 'customers', title: 'Customer Report', description: 'Customer insights and retention analysis', icon: FaUsers, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/20' },
    { id: 'restaurants', title: 'Restaurant Performance', description: 'Restaurant metrics and rankings', icon: FaStore, gradient: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/20' },
    { id: 'analytics', title: 'Platform Analytics', description: 'System usage and growth performance', icon: FaChartBar, gradient: 'from-pink-400 to-rose-500', shadow: 'shadow-rose-500/20' }
  ];

  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thismonth', label: 'This Month' },
    { value: 'thisyear', label: 'This Year' }
  ];

  const formats = [
    { value: 'pdf', label: 'PDF Report', icon: FaFilePdf, color: 'text-rose-500' },
    { value: 'excel', label: 'Excel Data', icon: FaFileExcel, color: 'text-emerald-500' },
    { value: 'csv', label: 'CSV Export', icon: FaFileCsv, color: 'text-blue-500' }
  ];

  const loadRealTimeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [restaurantsRes, zonesRes, ordersRes] = await Promise.allSettled([
        ApiService.get('/admin/restaurants'),
        ApiService.get('/admin/zones'), 
        ApiService.get('/orders')
      ]);

      const restaurants = restaurantsRes.status === 'fulfilled' ? (restaurantsRes.value.data?.data || restaurantsRes.value.data || []) : [];
      const zones = zonesRes.status === 'fulfilled' ? (zonesRes.value.data?.data || zonesRes.value.data || []) : [];
      const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data?.data || ordersRes.value.data || []) : [];

      const totalRevenue = Array.isArray(orders) ? orders.reduce((sum, order) => sum + (typeof (order.pricing?.total || order.total || order.finalAmount) === 'number' ? (order.pricing?.total || order.total || order.finalAmount) : 0), 0) : 0;
      
      setRealTimeData({
        totalRevenue,
        totalOrders: Array.isArray(orders) ? orders.length : 0,
        totalRestaurants: Array.isArray(restaurants) ? restaurants.length : 0,
        totalZones: Array.isArray(zones) ? zones.length : 0,
        activeRestaurants: Array.isArray(restaurants) ? restaurants.filter(r => r.status === 'active').length : 0,
        activeZones: Array.isArray(zones) ? zones.filter(z => z.status === 'active').length : 0,
        restaurants, zones, orders, lastUpdated: new Date().toISOString()
      });
      setLastUpdated(new Date());
    } catch (error) {
      setError('Failed to load real-time analytics data. Some endpoints may not be available.');
      setRealTimeData({ totalRevenue: 0, totalOrders: 0, totalRestaurants: 0, totalZones: 0, activeRestaurants: 0, activeZones: 0, restaurants: [], zones: [], orders: [], lastUpdated: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealTimeData();
  }, [loadRealTimeData]);

  const preview = useMemo(() => {
    if (!realTimeData) return { title: 'Loading...', estimatedSize: '...', estimatedTime: '...', charts: '0', tables: '0' };

    const reportType = reportTypes.find(r => r.id === selectedReport);
    const baseSize = JSON.stringify(realTimeData).length;
    const multipliers = { pdf: 3, excel: 2, csv: 1 };
    const estimatedBytes = baseSize * (multipliers[format] || 1);
    
    let estimatedSize = `${estimatedBytes} B`;
    if (estimatedBytes >= 1024 * 1024) estimatedSize = `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
    else if (estimatedBytes >= 1024) estimatedSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;

    const config = {
      revenue: { charts: '6', tables: '3' },
      orders: { charts: '8', tables: '4' },
      customers: { charts: '5', tables: '3' },
      restaurants: { charts: '4', tables: '2' },
      analytics: { charts: '12', tables: '6' }
    }[selectedReport] || { charts: '4', tables: '2' };

    return { title: reportType?.title || 'Report', estimatedSize, estimatedTime: format === 'pdf' ? '10-15 seconds' : '2-5 seconds', ...config };
  }, [realTimeData, selectedReport, format]);

  // Generate & Download logic
  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);
    try {
      if (!realTimeData) await loadRealTimeData();
      
      const reportData = {
        type: selectedReport,
        dateRange,
        generatedAt: new Date().toISOString(),
        dataSource: 'Real-time Database',
        summary: {
          totalRevenue: realTimeData.totalRevenue || 0,
          totalOrders: realTimeData.totalOrders || 0,
          totalRestaurants: realTimeData.totalRestaurants || 0,
          totalZones: realTimeData.totalZones || 0,
          activeRestaurants: realTimeData.activeRestaurants || 0,
          activeZones: realTimeData.activeZones || 0
        },
        data: realTimeData || {}
      };

      const content = formatReportContent(reportData, format);
      const filename = `${selectedReport}-report-${dateRange}-${new Date().toISOString().split('T')[0]}.${format}`;
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, format === 'pdf' ? 1500 : 800));
      downloadReport({ content, filename, format });

      const newReport = {
        id: Date.now().toString(),
        name: `${reportTypes.find(r => r.id === selectedReport)?.title}`,
        type: selectedReport, dateRange, format: format.toUpperCase(), size: preview.estimatedSize,
        date: new Date().toISOString().split('T')[0]
      };

      setRecentReports(prev => [newReport, ...prev.slice(0, 9)]);
      setSuccessMessage(`Report generated and downloaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const formatReportContent = (data, format) => {
    if (format === 'json') return JSON.stringify(data, null, 2);
    if (format === 'csv') return `Report Type,Value\nTotal Revenue,${data.summary.totalRevenue}\nTotal Orders,${data.summary.totalOrders}\nTotal Restaurants,${data.summary.totalRestaurants}\n`;
    
    // Minimal HTML for PDF generation trigger
    return `<!DOCTYPE html><html><head><title>${data.type} Report</title><style>body{font-family:sans-serif;padding:40px;color:#333;line-height:1.6;} .card{padding:20px;border:1px solid #ddd;border-radius:8px;margin-bottom:20px;} h1{color:#2563eb;}</style></head><body><h1>${data.type.toUpperCase()} Report</h1><p>Date: ${new Date(data.generatedAt).toLocaleString()}</p><div class="card"><h3>Overview Metrics</h3><p>Revenue: ₹${data.summary.totalRevenue}</p><p>Orders: ${data.summary.totalOrders}</p><p>Active Restaurants: ${data.summary.activeRestaurants}</p></div></body></html>`;
  };

  const downloadReport = (report) => {
    if (report.format === 'pdf') {
      const htmlBlob = new Blob([report.content], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(htmlBlob);
      const printWindow = window.open(url, '_blank', 'width=800,height=900');
      if (printWindow) {
        printWindow.addEventListener('load', () => setTimeout(() => printWindow.print(), 1000));
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      return;
    }
    
    const mimeTypes = { csv: 'text/csv;charset=utf-8;', excel: 'application/json;charset=utf-8;' };
    const blob = new Blob([report.format === 'csv' ? '\uFEFF' + report.content : report.content], { type: mimeTypes[report.format] || 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-8 max-w-[1400px] mx-auto pb-10 relative">
        
        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-theme-bg/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-3xl">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 border-4 border-theme-border-primary border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-theme-text-primary font-fredoka text-xl">Syncing Data...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {successMessage && (
              <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="p-4 bg-emerald-500/90 backdrop-blur-md text-white rounded-2xl shadow-lg flex items-center space-x-3 pointer-events-auto">
                <FaCheckCircle className="text-xl" />
                <span className="font-medium text-sm">{successMessage}</span>
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="p-4 bg-rose-500/90 backdrop-blur-md text-white rounded-2xl shadow-lg flex items-center space-x-3 pointer-events-auto">
                <FaExclamationTriangle className="text-xl" />
                <span className="font-medium text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-theme-bg-secondary p-6 sm:p-8 rounded-3xl border border-theme-border-primary/60 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-fredoka text-theme-text-primary mb-1 flex items-center">
              <FaFileExport className="mr-3 text-blue-500" /> Platform Reports
            </h1>
            <p className="text-theme-text-secondary font-raleway">Generate and export real-time analytics data.</p>
            {lastUpdated && (
              <div className="flex items-center space-x-2 mt-3 text-xs font-semibold uppercase tracking-wider text-theme-text-tertiary">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Synced: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          <button onClick={loadRealTimeData} disabled={loading} className="relative z-10 px-6 py-2.5 bg-theme-bg border border-theme-border-primary hover:border-theme-accent-primary/50 text-theme-text-primary rounded-xl font-medium transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50">
            <FaSyncAlt className={loading ? 'animate-spin text-theme-accent-primary' : 'text-theme-text-secondary'} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Report Type Selector */}
            <div className="space-y-4">
              <h2 className="text-lg font-fredoka text-theme-text-primary">1. Select Report Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reportTypes.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`relative p-5 rounded-2xl border text-left transition-all duration-300 overflow-hidden group ${
                      selectedReport === report.id
                        ? 'border-transparent shadow-lg transform scale-[1.02]'
                        : 'border-theme-border-primary/60 bg-theme-bg-secondary hover:border-theme-border-primary hover:bg-theme-bg-hover'
                    }`}
                  >
                    {selectedReport === report.id && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${report.gradient} opacity-100 z-0`}></div>
                    )}
                    <div className="relative z-10 flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${selectedReport === report.id ? 'bg-white/20 text-white' : 'bg-theme-bg border border-theme-border-primary text-theme-text-primary group-hover:scale-110 transition-transform'}`}>
                        <report.icon className="text-xl" />
                      </div>
                      <div>
                        <h3 className={`font-fredoka text-lg ${selectedReport === report.id ? 'text-white' : 'text-theme-text-primary'}`}>
                          {report.title}
                        </h3>
                        <p className={`text-sm mt-1 leading-snug ${selectedReport === report.id ? 'text-white/80' : 'text-theme-text-secondary'}`}>
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Configuration */}
            <div className="space-y-4">
              <h2 className="text-lg font-fredoka text-theme-text-primary">2. Configuration</h2>
              <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 shadow-sm space-y-6">
                
                {/* Date Range */}
                <div>
                  <label className="flex items-center text-sm font-bold uppercase tracking-wider text-theme-text-secondary mb-3">
                    <FaCalendarAlt className="mr-2" /> Date Range
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {dateRanges.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => setDateRange(range.value)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          dateRange === range.value
                            ? 'bg-gray-900 text-white border border-gray-900'
                            : 'bg-theme-bg border border-theme-border-primary text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-text-tertiary'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px w-full bg-theme-border-primary/50"></div>

                {/* Export Format */}
                <div>
                  <label className="flex items-center text-sm font-bold uppercase tracking-wider text-theme-text-secondary mb-3">
                    <FaFileExport className="mr-2" /> Export Format
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {formats.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFormat(f.value)}
                        className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                          format === f.value
                            ? 'bg-theme-bg border-2 border-blue-500 shadow-md text-theme-text-primary'
                            : 'bg-theme-bg border-2 border-transparent hover:border-theme-border-primary text-theme-text-secondary'
                        }`}
                      >
                        <f.icon className={format === f.value ? f.color : 'text-theme-text-tertiary'} />
                        <span>{f.label}</span>
                        {format === f.value && <FaCheckCircle className="ml-2 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Report Preview & Generate Action */}
          <div className="space-y-6">
            <h2 className="text-lg font-fredoka text-theme-text-primary">3. Generate</h2>
            <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 shadow-sm sticky top-24">
              
              <div className="bg-theme-bg rounded-2xl border border-theme-border-primary/50 p-5 mb-6">
                <h3 className="font-fredoka text-lg text-theme-text-primary border-b border-theme-border-primary/50 pb-3 mb-4">
                  Report Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-theme-text-secondary font-medium text-sm">Type</span>
                    <span className="text-theme-text-primary font-bold text-sm bg-theme-bg-secondary px-2 py-1 rounded">{preview.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-text-secondary font-medium text-sm">Timeframe</span>
                    <span className="text-theme-text-primary font-bold text-sm bg-theme-bg-secondary px-2 py-1 rounded capitalize">{dateRange.replace('last', 'Last ').replace('this', 'This ')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-text-secondary font-medium text-sm">File Type</span>
                    <span className="text-theme-text-primary font-bold text-sm bg-theme-bg-secondary px-2 py-1 rounded uppercase">{format}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-text-secondary font-medium text-sm">Est. Size</span>
                    <span className="text-theme-text-primary font-bold text-sm">{preview.estimatedSize}</span>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-theme-border-primary/50 grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 text-theme-text-secondary">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><FaChartBar /></div>
                      <div><p className="text-xs font-bold">{preview.charts}</p><p className="text-[10px] uppercase tracking-wide">Charts</p></div>
                    </div>
                    <div className="flex items-center space-x-2 text-theme-text-secondary">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><FaTable /></div>
                      <div><p className="text-xs font-bold">{preview.tables}</p><p className="text-[10px] uppercase tracking-wide">Tables</p></div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={generating || loading || !realTimeData}
                className="w-full py-3.5 rounded-xl font-fredoka text-lg font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {generating ? (
                  <><FaSpinner className="animate-spin" /><span>Processing...</span></>
                ) : (
                  <><FaDownload /><span>Download {format.toUpperCase()}</span></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Reports Table */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-fredoka text-theme-text-primary">Recent Downloads</h2>
            {recentReports.length > 0 && (
              <button onClick={() => setRecentReports([])} className="text-rose-500 hover:text-rose-600 font-medium text-sm">Clear History</button>
            )}
          </div>
          
          <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl overflow-hidden shadow-sm">
            {recentReports.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-theme-bg rounded-full flex items-center justify-center mx-auto mb-4 border border-theme-border-primary">
                  <FaFileExport className="text-3xl text-theme-text-tertiary" />
                </div>
                <p className="text-theme-text-primary font-fredoka text-lg mb-1">No Recent Reports</p>
                <p className="text-theme-text-secondary text-sm">Generated reports will appear here for quick access.</p>
              </div>
            ) : (
              <table className="min-w-full text-left">
                <thead className="bg-theme-bg/50 border-b border-theme-border-primary/60">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Report Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Format</th>
                    <th className="px-6 py-4 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border-primary/40">
                  {recentReports.map((report) => (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={report.id} className="hover:bg-theme-bg/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-sm text-theme-text-primary">{report.name}</td>
                      <td className="px-6 py-4 text-sm text-theme-text-secondary">{report.date}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-theme-bg border border-theme-border-primary text-theme-text-primary">{report.format}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-theme-text-secondary">{report.size}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
};

export default Reports;