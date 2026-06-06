import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetOrdersQuery } from '../../../store/api/ordersApi';
import DashboardAnalyticsService from '../../../services/DashboardAnalyticsService';
import * as XLSX from 'xlsx';
import {
  FaChartLine,
  FaRupeeSign,
  FaShoppingCart,
  FaUtensils,
  FaArrowUp,
  FaCalendarAlt,
  FaReceipt,
  FaCircle,
  FaFileExcel
} from 'react-icons/fa';
import ZoneShopLayout from '../pages/ZoneShopLayout';
import { ErrorBoundary } from '../../../shared/errors/ErrorBoundary';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

/**
 * Zone Shop Analytics
 *
 * Mirrors the restaurant Analytics page (src/features/owner/pages/Analytics.jsx):
 *   - Fetch raw orders via RTK Query (no broken backend `/analytics/shops/...` endpoint)
 *   - Compute stats CLIENT-SIDE with DashboardAnalyticsService (same service the
 *     restaurant uses — works on any orders array regardless of entity type)
 *   - Build the daily/weekly/monthly revenue chart from the raw orders
 *   - Build the Transaction Ledger + Excel export from the same raw orders
 *
 * The previous version called `ApiService.getShopAnalytics(...)` which hit an
 * endpoint that returned data in a shape the UI didn't fully consume — so the
 * page either showed zeros or nothing. The restaurant version sidesteps that
 * entirely by computing everything in the browser from the orders list, which is
 * what we now do here.
 */
const ZoneShopAnalytics = () => {
  const { zoneId, shopId } = useParams();
  const [timeRange, setTimeRange] = useState('week');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filteredOrdersList, setFilteredOrdersList] = useState([]);

  const { isAuthenticated } = useSelector((state) => state.ui.auth);

  // RTK Query: same hook + same response shape ({ orders, liveOrders, ... }) as the
  // restaurant Analytics page. Skips while the user isn't authenticated or shopId missing.
  const {
    data: ordersData,
    isLoading: ordersLoading
  } = useGetOrdersQuery(
    { role: 'zone_shop', entityId: shopId },
    { skip: !shopId || !isAuthenticated }
  );

  const orders = ordersData?.orders || [];
  const liveOrders = ordersData?.liveOrders || [];

  // ====== Compute stats whenever orders or the selected range changes ======
  useEffect(() => {
    try {
      // DashboardAnalyticsService treats the first arg as a label only — it computes
      // everything from the orders array — so passing shopId works the same way passing
      // restaurantId works on the restaurant side.
      const dashboardStats = DashboardAnalyticsService.getRestaurantDashboardStats(
        shopId,
        orders,
        liveOrders
      );

      let selectedPeriodData;
      switch (timeRange) {
        case 'today': selectedPeriodData = dashboardStats.today; break;
        case 'week':  selectedPeriodData = dashboardStats.week;  break;
        case 'month':
        case 'quarter':
        case 'year':  selectedPeriodData = dashboardStats.month; break;
        default:      selectedPeriodData = dashboardStats.week;
      }

      // Time boundary for ledger / chart filtering
      const getStartDate = (daysOffset) => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        if (daysOffset > 0) start.setDate(start.getDate() - daysOffset);
        return start;
      };

      let daysOffset = 7;
      switch (timeRange) {
        case 'today':   daysOffset = 0;   break;
        case 'week':    daysOffset = 7;   break;
        case 'month':   daysOffset = 30;  break;
        case 'quarter': daysOffset = 90;  break;
        case 'year':    daysOffset = 365; break;
        default:        daysOffset = 7;
      }

      const boundaryDate = getStartDate(daysOffset);

      // Filtered orders for the ledger table and Excel export
      const periodOrders = orders
        .filter((order) => new Date(order.createdAt) >= boundaryDate)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setFilteredOrdersList(periodOrders);

      // Period revenue (raw — DashboardAnalyticsService returns it formatted, we want the raw number)
      const selectedRevenue = periodOrders.reduce((total, order) => {
        const orderTotal = order.pricing?.total || order.totalAmount || order.grandTotal || order.total || 0;
        return total + (isNaN(parseFloat(orderTotal)) ? 0 : parseFloat(orderTotal));
      }, 0);

      setAnalyticsData({
        overview: {
          totalRevenue: selectedRevenue,
          totalOrders: periodOrders.length || 0
        },
        recentOrders: calculateDailyRevenue(orders, timeRange),
        topItems: selectedPeriodData?.popularItems || []
      });
    } catch (err) {
      console.error('Error computing zone shop analytics:', err);
      setAnalyticsData({ overview: { totalRevenue: 0, totalOrders: 0 }, recentOrders: [], topItems: [] });
    }
  }, [shopId, timeRange, orders, liveOrders]);

  // ====== Build chart data: group revenue by hour/day/week/month depending on range ======
  // Identical algorithm to RestaurantAnalytics.calculateDailyRevenue so the chart looks
  // the same in both UIs.
  const calculateDailyRevenue = (allOrders, range) => {
    const now = new Date();
    const startDate = new Date();
    switch (range) {
      case 'today':   startDate.setHours(0, 0, 0, 0); break;
      case 'week':    startDate.setDate(now.getDate() - 7); break;
      case 'month':   startDate.setDate(now.getDate() - 30); break;
      case 'quarter': startDate.setDate(now.getDate() - 90); break;
      case 'year':    startDate.setDate(now.getDate() - 365); break;
      default:        startDate.setDate(now.getDate() - 7);
    }

    const dataMap = {};

    allOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      if (orderDate < startDate) return;

      let key, sortKey;
      if (range === 'today') {
        key = orderDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        sortKey = orderDate.getHours();
      } else if (range === 'week') {
        key = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
        sortKey = orderDate.getTime();
      } else if (range === 'month') {
        key = orderDate.getDate().toString();
        sortKey = orderDate.getDate();
      } else if (range === 'quarter') {
        const weekNum = Math.ceil(orderDate.getDate() / 7);
        key = `Week ${weekNum}`;
        sortKey = weekNum;
      } else if (range === 'year') {
        key = orderDate.toLocaleDateString('en-US', { month: 'short' });
        sortKey = orderDate.getMonth();
      } else {
        key = orderDate.toLocaleDateString('en-CA');
        sortKey = orderDate.getTime();
      }

      if (!dataMap[key]) dataMap[key] = { date: key, revenue: 0, orders: 0, sortKey };
      const orderRevenue = order.pricing?.total || order.totalAmount || order.grandTotal || order.total || 0;
      dataMap[key].revenue += parseFloat(orderRevenue) || 0;
      dataMap[key].orders += 1;
    });

    return Object.values(dataMap).sort((a, b) => a.sortKey - b.sortKey);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

  const formatYAxis = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  const formatDateAxis = (dateStr) => dateStr;

  // ====== Excel export — same format the restaurant uses ======
  const handleExportExcel = () => {
    if (filteredOrdersList.length === 0) {
      alert('No data to export for this period.');
      return;
    }

    const excelData = filteredOrdersList.map((order) => {
      const date = new Date(order.createdAt);
      const orderTotal = order.pricing?.total || order.totalAmount || order.grandTotal || order.total || 0;
      const itemsCount = order.items?.length || order.orderItems?.length || 0;
      return {
        'Order ID':    order.orderNumber || order.id || order._id,
        'Date':        date.toLocaleDateString('en-IN'),
        'Time':        date.toLocaleTimeString('en-IN'),
        'Table/Source': order.tableNumber ? `Table ${order.tableNumber}` : (order.table || 'N/A'),
        'Items Count': itemsCount,
        'Status':      order.status || 'Completed',
        'Revenue (₹)': parseFloat(orderTotal).toFixed(2)
      };
    });

    const totalRevenue = filteredOrdersList.reduce((sum, order) => {
      const orderTotal = order.pricing?.total || order.totalAmount || order.grandTotal || order.total || 0;
      return sum + parseFloat(orderTotal);
    }, 0);
    excelData.push({
      'Order ID': '', 'Date': '', 'Time': '', 'Table/Source': '',
      'Items Count': '', 'Status': 'TOTAL', 'Revenue (₹)': totalRevenue.toFixed(2)
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'FF6B00' } },
        alignment: { horizontal: 'center' }
      };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Revenue Report');
    workbook.Props = {
      Title: `Shop Revenue Report - ${timeRange}`,
      Subject: 'Financial Analytics',
      Author: 'Tableserves',
      CreatedDate: new Date()
    };
    const filename = `Shop_Revenue_${timeRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const { maxItemOrders, averageOrderValue, chartItems } = useMemo(() => {
    if (!analyticsData) return { maxItemOrders: 0, averageOrderValue: 0, chartItems: [] };
    const maxItems = Math.max(...analyticsData.topItems.map((i) => i.orders), 1);
    const aov = analyticsData.overview.totalOrders > 0
      ? analyticsData.overview.totalRevenue / analyticsData.overview.totalOrders
      : 0;
    const items = [...analyticsData.topItems].filter((item) => !item.name.includes('No orders')).slice(0, 8);
    return { maxItemOrders: maxItems, averageOrderValue: aov, chartItems: items };
  }, [analyticsData]);

  const CustomRevenueTooltip = ({ active, payload, label }) => {
    if (!(active && payload && payload.length)) return null;
    return (
      <div className="admin-card backdrop-blur-md p-4 rounded-xl shadow-2xl outline-none">
        <p className="text-xs font-semibold text-theme-text-tertiary mb-2 uppercase tracking-wider">{label}</p>
        <div className="flex items-end gap-3">
          <p className="text-2xl font-bold text-theme-text-primary">{formatCurrency(payload[0].value)}</p>
          <p className="text-sm font-medium text-status-success mb-1 flex items-center gap-1">
            <FaCircle className="text-[6px]" /> {payload[0].payload.orders} orders
          </p>
        </div>
      </div>
    );
  };

  const getStatusStyle = (status) => {
    const s = status?.toLowerCase();
    if (['completed', 'delivered'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['cancelled', 'failed'].includes(s)) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  if (ordersLoading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-theme-text-secondary tracking-wide">Loading analytics data...</p>
          </div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ErrorBoundary>
      <ZoneShopLayout>
        <div className="w-full h-full flex flex-col gap-6 pb-12">

          {/* Header Controls */}
          <div className="admin-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight">Shop Analytics</h1>
              <p className="text-sm text-theme-text-secondary mt-1">Real-time revenue telemetry and performance insights.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary text-sm" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="input-theme w-full md:w-48 pl-9 pr-8 py-2 text-sm font-medium rounded-lg appearance-none cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="week">Trailing 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">YTD</option>
                </select>
              </div>

              <button
                onClick={handleExportExcel}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 btn-primary text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <FaFileExcel className="text-sm" />
                Export Excel
              </button>
            </div>
          </div>

          {/* Primary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-card rounded-2xl p-6 relative overflow-hidden group hover:border-status-success transition-colors">
              <div className="absolute right-0 top-0 w-24 h-24 bg-status-success-light rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-status-success-light text-status-success rounded-xl flex items-center justify-center">
                    <FaRupeeSign className="text-lg" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-status-success bg-status-success-light px-2 py-1 rounded-md">
                    <FaArrowUp className="text-[8px]" /> Active
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-theme-text-primary tracking-tight">{formatCurrency(analyticsData?.overview.totalRevenue)}</h3>
                <p className="text-sm font-medium text-theme-text-secondary mt-1">Gross Revenue</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="admin-card rounded-2xl p-6 relative overflow-hidden group hover:border-accent transition-colors">
              <div className="absolute right-0 top-0 w-24 h-24 bg-accent/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                    <FaShoppingCart className="text-lg" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-theme-text-primary tracking-tight">{analyticsData?.overview.totalOrders}</h3>
                <p className="text-sm font-medium text-theme-text-secondary mt-1">Total Volume</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="admin-card rounded-2xl p-6 relative overflow-hidden group hover:border-status-info transition-colors">
              <div className="absolute right-0 top-0 w-24 h-24 bg-status-info-light rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-status-info-light text-status-info rounded-xl flex items-center justify-center">
                    <FaReceipt className="text-lg" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-theme-text-primary tracking-tight">{formatCurrency(averageOrderValue)}</h3>
                <p className="text-sm font-medium text-theme-text-secondary mt-1">Average Order Value (AOV)</p>
              </div>
            </motion.div>
          </div>

          {/* Charts & Velocity Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trajectory */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 admin-card rounded-2xl flex flex-col h-[420px]">
              <div className="px-6 py-5 border-b border-theme-border-primary">
                <h3 className="text-base font-bold text-theme-text-primary">Revenue Trajectory</h3>
              </div>

              <div className="p-4 flex-1 w-full h-full">
                {analyticsData?.recentOrders.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.recentOrders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDateAxis}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--text-tertiary)', fontWeight: 500 }}
                        dy={10}
                        minTickGap={20}
                      />
                      <YAxis
                        tickFormatter={formatYAxis}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--text-tertiary)', fontWeight: 500 }}
                      />
                      <Tooltip content={<CustomRevenueTooltip />} cursor={{ stroke: 'var(--border-secondary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#FF6B00"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        activeDot={{ r: 6, fill: '#FF6B00', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-theme-text-tertiary">
                    <FaChartLine className="text-4xl mb-3 opacity-30" />
                    <p className="font-medium text-sm">Insufficient data for trajectory charting</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Velocity Matrix (Top Sellers) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="admin-card rounded-2xl flex flex-col h-[420px]">
              <div className="px-6 py-5 border-b border-theme-border-primary flex justify-between items-center">
                <h3 className="text-base font-bold text-theme-text-primary">Velocity Matrix</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-theme-text-tertiary">Top Sellers</span>
              </div>

              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {chartItems.length > 0 ? (
                  <div className="space-y-6">
                    {chartItems.map((item, index) => {
                      const widthPercent = (item.orders / maxItemOrders) * 100;
                      return (
                        <div key={index} className="relative group">
                          <div className="flex justify-between items-end mb-2 relative z-10">
                            <span className="text-sm font-bold text-theme-text-primary truncate pr-4">{item.name}</span>
                            <span className="text-xs font-bold text-accent whitespace-nowrap bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                              {item.orders} Sold
                            </span>
                          </div>
                          <div className="w-full bg-theme-bg-tertiary rounded-full h-2.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPercent}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
                              className="bg-accent h-full rounded-full"
                            />
                          </div>
                          <div className="text-[11px] font-medium text-theme-text-tertiary mt-1.5 flex justify-between">
                            <span>Rank #{index + 1}</span>
                            <span className="text-theme-text-secondary font-bold">{item.revenue}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-theme-text-tertiary">
                    <FaUtensils className="text-4xl mb-3 opacity-30" />
                    <p className="font-medium text-sm">No item velocity data available</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Transaction Ledger */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="admin-card rounded-2xl flex flex-col overflow-hidden flex-1">
            <div className="px-6 py-5 border-b border-theme-border-primary flex justify-between items-center bg-theme-bg-secondary">
              <div>
                <h3 className="text-base font-bold text-theme-text-primary">Transaction Ledger</h3>
                <p className="text-xs text-theme-text-secondary mt-0.5">Detailed breakdown for {timeRange}</p>
              </div>
              <span className="text-xs font-bold text-theme-text-secondary bg-theme-bg-primary px-3 py-1.5 rounded-lg border border-theme-border-primary shadow-sm">
                {filteredOrdersList.length} Records
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-theme-bg-secondary border-b border-theme-border-primary text-xs uppercase tracking-wider text-theme-text-tertiary">
                    <th className="px-6 py-4 font-bold">Order ID</th>
                    <th className="px-6 py-4 font-bold">Date & Time</th>
                    <th className="px-6 py-4 font-bold">Table / Src</th>
                    <th className="px-6 py-4 font-bold text-center">Items</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border-primary">
                  {filteredOrdersList.length > 0 ? (
                    filteredOrdersList.map((order) => {
                      const orderDate = new Date(order.createdAt);
                      const orderTotal = order.pricing?.total || order.totalAmount || order.grandTotal || order.total || 0;
                      const itemsCount = order.items?.length || order.orderItems?.length || 0;
                      return (
                        <tr key={order.id || order._id} className="hover:bg-theme-bg-hover transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-theme-text-primary whitespace-nowrap">
                            #{order.orderNumber || order.id?.substring(0, 8) || order._id?.substring(0, 8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-theme-text-primary">{orderDate.toLocaleDateString('en-IN')}</div>
                            <div className="text-xs text-theme-text-tertiary">{orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-theme-text-secondary font-medium">
                            {order.tableNumber ? `Table ${order.tableNumber}` : (order.table || 'N/A')}
                          </td>
                          <td className="px-6 py-4 text-sm text-theme-text-secondary font-bold text-center">
                            {itemsCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(order.status)}`}>
                              {order.status || 'Completed'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-theme-text-primary text-right whitespace-nowrap">
                            {formatCurrency(parseFloat(orderTotal))}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-theme-text-tertiary">
                        <FaReceipt className="text-3xl mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-sm">No transactions found for this period.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

        </div>
      </ZoneShopLayout>
    </ErrorBoundary>
  );
};

export default ZoneShopAnalytics;
