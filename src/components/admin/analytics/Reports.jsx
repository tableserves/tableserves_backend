import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaFileExport,
  FaDownload,
  FaCalendarAlt,
  FaChartBar,
  FaDollarSign,
  FaUsers,
  FaStore,
  FaShoppingCart,
  FaTable,
  FaFilter,
  FaEye,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';
import ReportService from '../../../services/ReportService';
import DownloadUtils from '../../../utils/downloadUtils';
import SampleDataService from '../../../services/SampleDataService';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('revenue');
  const [dateRange, setDateRange] = useState('last30days');
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [reportPreview, setReportPreview] = useState(null);
  const [error, setError] = useState(null);

  const reportTypes = [
    {
      id: 'revenue',
      title: 'Revenue Report',
      description: 'Comprehensive revenue analysis across all restaurants and zones',
      icon: FaDollarSign,
      color: 'bg-status-success'
    },
    {
      id: 'orders',
      title: 'Orders Report',
      description: 'Detailed order statistics and trends',
      icon: FaShoppingCart,
      color: 'bg-status-info'
    },
  
   
    {
      id: 'analytics',
      title: 'Platform Analytics',
      description: 'Overall platform usage and performance',
      icon: FaChartBar,
      color: 'bg-status-info'
    }
  ];

  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 90 Days' },
    { value: 'thismonth', label: 'This Month' },
    { value: 'lastmonth', label: 'Last Month' },
    { value: 'thisyear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const formats = [
    { value: 'pdf', label: 'PDF', icon: FaFileExport },
    { value: 'excel', label: 'Excel', icon: FaDownload },
    { value: 'csv', label: 'CSV', icon: FaDownload }
  ];

  // Load recent reports on component mount
  useEffect(() => {
    // Initialize sample data if none exists
    if (!SampleDataService.hasSampleData()) {
      SampleDataService.initializeSampleData();
    }

    loadRecentReports();
    updateReportPreview();
  }, [selectedReport, dateRange, format]);

  const loadRecentReports = () => {
    // Load recent reports from localStorage
    const savedReports = JSON.parse(localStorage.getItem('tableserve_recent_reports') || '[]');
    setRecentReports(savedReports);
  };

  const updateReportPreview = () => {
    try {
      // Generate preview data for the selected report
      const previewData = ReportService.getReportData(selectedReport, dateRange);
      const estimatedSize = ReportService.estimateFileSize(previewData, format);

      setReportPreview({
        title: reportTypes.find(r => r.id === selectedReport)?.title || 'Report',
        estimatedSize,
        estimatedTime: '30 seconds',
        dataPoints: calculateDataPoints(previewData),
        charts: '8',
        tables: '12'
      });
      setError(null);
    } catch (err) {
      setError('Failed to generate report preview');
      console.error('Preview error:', err);
    }
  };

  const calculateDataPoints = (data) => {
    if (!data) return '0';

    let count = 0;
    if (data.restaurantBreakdown) count += data.restaurantBreakdown.length;
    if (data.zoneBreakdown) count += data.zoneBreakdown.length;
    if (data.orderDetails) count += data.orderDetails.length;
    if (data.customerData) count += data.customerData.length;

    return count > 1000 ? `${Math.floor(count / 1000)}K+` : count.toString();
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);

    try {
      // Generate real report with actual data
      const report = ReportService.generateReport(selectedReport, dateRange, format);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Download the report
      DownloadUtils.downloadReport(report.content, format, report.filename);

      // Save to recent reports
      const newReport = {
        id: Date.now().toString(),
        name: `${reportTypes.find(r => r.id === selectedReport)?.title} - ${dateRanges.find(r => r.value === dateRange)?.label}`,
        type: selectedReport,
        dateRange,
        format: format.toUpperCase(),
        size: report.size,
        date: new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString()
      };

      const updatedReports = [newReport, ...recentReports.slice(0, 9)]; // Keep last 10 reports
      setRecentReports(updatedReports);
      localStorage.setItem('tableserve_recent_reports', JSON.stringify(updatedReports));

      // Show success message
      alert(`Report "${report.filename}" has been generated and downloaded successfully!`);

    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error('Report generation error:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadRecentReport = async (report) => {
    try {
      // Regenerate the report data
      const reportData = ReportService.generateReport(report.type, report.dateRange, report.format.toLowerCase());

      // Download the report
      DownloadUtils.downloadReport(reportData.content, report.format.toLowerCase(), reportData.filename);

      alert(`Report "${reportData.filename}" has been downloaded successfully!`);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download report. Please try again.');
    }
  };

  const handleViewReportPreview = (report) => {
    try {
      const reportData = ReportService.getReportData(report.type, report.dateRange);
      const preview = DownloadUtils.createReportPreview(reportData, 20);

      // Create a blob URL for the preview
      const htmlContent = `
        <html>
          <head><title>Report Preview - ${report.name}</title></head>
          <body style="font-family: monospace; padding: 20px;">
            <h2>Report Preview: ${report.name}</h2>
            <hr>
            <pre>${preview}</pre>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'width=800,height=600');

      // Clean up the URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('Preview error:', err);
      alert('Failed to generate report preview.');
    }
  };

  const preview = reportPreview || {
    title: 'Loading...',
    estimatedSize: 'Calculating...',
    estimatedTime: 'Calculating...',
    dataPoints: 'Calculating...',
    charts: '8',
    tables: '12'
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Reports</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Generate comprehensive platform reports</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Types */}
            <div className="admin-card rounded-2xl p-6">
              <h2 className="text-xl font-fredoka text-theme-text-primary mb-4">Select Report Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reportTypes.map((report) => (
                  <motion.button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedReport === report.id
                        ? 'border-theme-accent-primary bg-theme-accent-primary/10'
                        : 'border-theme-border-primary hover:border-theme-accent-primary/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-10 h-10 ${report.color} rounded-lg flex items-center justify-center`}>
                        <report.icon className="text-theme-text-inverse" />
                      </div>
                      <h3 className="font-fredoka text-theme-text-primary">{report.title}</h3>
                    </div>
                    <p className="text-theme-text-secondary font-raleway text-sm">{report.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div className="admin-card rounded-2xl p-6">
              <h2 className="text-xl font-fredoka text-theme-text-primary mb-4">Report Configuration</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none autofill-protected"
                  >
                    {dateRanges.map((range) => (
                      <option key={range.value} value={range.value} className="bg-theme-bg-secondary text-theme-text-primary">{range.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none autofill-protected"
                  >
                    {formats.map((fmt) => (
                      <option key={fmt.value} value={fmt.value} className="bg-theme-bg-secondary text-theme-text-primary">{fmt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Preview & Generate */}
          <div className="space-y-6">
            {/* Report Preview */}
            <div className="admin-card rounded-2xl p-6">
              <h2 className="text-xl font-fredoka text-theme-text-primary mb-4">Report Preview</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-theme-text-secondary font-raleway text-sm">Report Type</span>
                  <span className="text-theme-text-primary font-raleway text-sm">{preview.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-text-secondary font-raleway text-sm">Date Range</span>
                  <span className="text-theme-text-primary font-raleway text-sm">
                    {dateRanges.find(r => r.value === dateRange)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-text-secondary font-raleway text-sm">Format</span>
                  <span className="text-theme-text-primary font-raleway text-sm">{format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-text-secondary font-raleway text-sm">Est. Size</span>
                  <span className="text-theme-text-primary font-raleway text-sm">{preview.estimatedSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-text-secondary font-raleway text-sm">Est. Time</span>
                  <span className="text-theme-text-primary font-raleway text-sm">{preview.estimatedTime}</span>
                </div>
              </div>
            </div>

            {/* Report Details */}
            <div className="admin-card rounded-2xl p-6">
              <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Report Contents</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FaChartBar className="text-theme-accent-primary" />
                  <span className="text-theme-text-secondary font-raleway text-sm">{preview.charts} Charts & Graphs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaTable className="text-theme-accent-primary" />
                  <span className="text-theme-text-secondary font-raleway text-sm">{preview.tables} Data Tables</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaUsers className="text-theme-accent-primary" />
                  <span className="text-theme-text-secondary font-raleway text-sm">{preview.dataPoints} Data Points</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className={`w-full btn-primary py-3 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2 ${
                generating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {generating ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FaDownload />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="admin-card rounded-2xl p-6">
          <h2 className="text-xl font-fredoka text-theme-text-primary mb-4">Recent Reports</h2>
          {error && (
            <div className="mb-4 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <FaExclamationTriangle className="text-status-error" />
                <span className="text-status-error font-raleway text-sm">{error}</span>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {recentReports.length === 0 ? (
              <div className="text-center py-8">
                <FaFileExport className="text-theme-text-tertiary text-3xl mx-auto mb-3" />
                <p className="text-theme-text-secondary font-raleway">No recent reports found</p>
                <p className="text-theme-text-tertiary font-raleway text-sm">Generate your first report to see it here</p>
              </div>
            ) : (
              recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-theme-bg-hover transition-colors">
                  <div className="flex items-center space-x-3">
                    <FaFileExport className="text-theme-accent-primary" />
                    <div>
                      <h4 className="text-theme-text-primary font-raleway font-medium text-sm">{report.name}</h4>
                      <p className="text-theme-text-tertiary font-raleway text-xs">
                        {report.date} • {report.size} • {report.format}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewReportPreview(report)}
                      className="text-theme-text-secondary hover:text-theme-accent-primary transition-colors"
                      title="Preview Report"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleDownloadRecentReport(report)}
                      className="text-theme-accent-primary hover:text-theme-accent-hover transition-colors"
                      title="Download Report"
                    >
                      <FaDownload />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {recentReports.length > 0 && (
            <div className="mt-4 pt-4 border-t border-theme-border-primary">
              <div className="flex items-center justify-between text-sm">
                <span className="text-theme-text-secondary font-raleway">
                  {recentReports.length} report{recentReports.length !== 1 ? 's' : ''} available
                </span>
                <button
                  onClick={() => {
                    setRecentReports([]);
                    localStorage.removeItem('tableserve_recent_reports');
                  }}
                  className="text-theme-text-tertiary hover:text-status-error transition-colors font-raleway"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default Reports;
