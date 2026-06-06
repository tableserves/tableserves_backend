import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetLiveOrdersQuery } from '../../../store/api/ordersApi';
import ApiService from '../../../shared/api/ApiService';
import * as XLSX from 'xlsx';
import {
  FaRupeeSign,
  FaChartLine,
  FaStore,
  FaShoppingCart,
  FaArrowUp,
  FaCalendarAlt,
  FaFileExcel,
  FaCircle,
  FaReceipt
} from 'react-icons/fa';
import ZoneAdminLayout from '../pages/ZoneAdminLayout';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

const ZoneAnalytics = () => {
  const { zoneId } = useParams();
  const [loading, setLoading] = useState(true);
  const [zoneShops, setZoneShops] = useState([]);
  const [timeRange, setTimeRange] = useState('week');

  const { 
    data: ordersData, 
    isLoading: ordersLoading
  } = useGetLiveOrdersQuery({
    role: 'zone_admin',
    entityId: zoneId
  });
  
  const orders = Array.isArray(ordersData) ? ordersData.filter(Boolean) : [];

  useEffect(() => {
    const fetchZoneShops = async () => {
      if (!zoneId) return;
      try {
        setLoading(true);
        const result = await ApiService.getZoneShops(zoneId);
        setZoneShops(result.shops || []);
      } catch (error) {
        console.error('❌ Analytics: Failed to fetch zone shops:', error.message);
        setZoneShops([]);
      } finally {
        setLoading(false);
      }
    };
    fetchZoneShops();
  }, [zoneId]);

  const analyticsData = useMemo(() => {
    const safeZoneShops = Array.isArray(zoneShops) ? zoneShops.filter(Boolean) : [];

    if (!orders.length) {
      return {
        overview: { totalRevenue: 0, totalOrders: 0, activeShops: 0, totalShops: safeZoneShops.length },
        topShops: [],
        recentOrders: [],
        ledgerOrders: []
      };
    }

    // 1. Calculate Time Boundaries
    const now = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case 'today': startDate.setHours(0, 0, 0, 0); break;
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setDate(now.getDate() - 30); break;
      case 'quarter': startDate.setDate(now.getDate() - 90); break;
      case 'year': startDate.setDate(now.getDate() - 365); break;
      default: startDate.setDate(now.getDate() - 7);
    }

    // 2. Filter Orders by Time Range
    const periodOrders = orders.filter(o => new Date(o.createdAt || o.date || new Date()) >= startDate);

    // 3. Separate Order Types & Initialize Stats
    const zoneMainOrders = [];
    const shopPerformanceMap = new Map();
    const timeSeriesMap = {};

    safeZoneShops.forEach((shop) => {
      const rawId = shop?._id || shop?.id;
      if (!rawId) return;

      const id = String(rawId);
      shopPerformanceMap.set(id, { id, name: shop.name || `Shop ${id.slice(-4)}`, revenue: 0, orders: 0 });
    });

    // Each zone order is single-shop now; one pass covers both revenue trajectory and per-shop performance.
    periodOrders.forEach(order => {
      if (order.zoneId) zoneMainOrders.push(order);
    });

    let totalRevenue = 0;
    zoneMainOrders.forEach(order => {
      const orderRev = parseFloat(order.total || order.pricing?.total || 0) || 0;
      totalRevenue += orderRev;

      // Grouping for Recharts
      const orderDate = new Date(order.createdAt || order.date || new Date());
      let key, sortKey;

      if (timeRange === 'today') {
        key = orderDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        sortKey = orderDate.getHours();
      } else if (timeRange === 'week') {
        key = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
        sortKey = orderDate.getTime();
      } else if (timeRange === 'month') {
        key = orderDate.getDate().toString();
        sortKey = orderDate.getDate();
      } else {
        key = orderDate.toLocaleDateString('en-US', { month: 'short' });
        sortKey = orderDate.getMonth();
      }

      if (!timeSeriesMap[key]) {
        timeSeriesMap[key] = { date: key, revenue: 0, orders: 0, sortKey };
      }
      timeSeriesMap[key].revenue += orderRev;
      timeSeriesMap[key].orders += 1;

      // Velocity matrix: attribute order to its shop
      const orderShopId = order.shopId && typeof order.shopId === 'object'
        ? (order.shopId._id || order.shopId.id)
        : order.shopId;
      if (orderShopId) {
        const shopIdStr = String(orderShopId);
        let current = shopPerformanceMap.get(shopIdStr);
        
        // If shop not in map, create entry from order data
        if (!current) {
          const shopName = order.shopId && typeof order.shopId === 'object'
            ? order.shopId.name
            : `Shop ${shopIdStr.slice(-4)}`;
          current = { id: shopIdStr, name: shopName || `Shop ${shopIdStr.slice(-4)}`, revenue: 0, orders: 0 };
          shopPerformanceMap.set(shopIdStr, current);
        }
        
        shopPerformanceMap.set(shopIdStr, { ...current, revenue: current.revenue + orderRev, orders: current.orders + 1 });
      }
    });

    // 6. Final Formatting & Sorting
    const activeShops = safeZoneShops.filter(s => s?.status === 'active').length;
    const topShops = Array.from(shopPerformanceMap.values())
      .filter(s => s.revenue > 0 || s.orders > 0)
      .sort((a, b) => b.revenue - a.revenue);
    
    const recentOrders = Object.values(timeSeriesMap).sort((a, b) => a.sortKey - b.sortKey);
    const ledgerOrders = zoneMainOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      overview: { totalRevenue, totalOrders: zoneMainOrders.length, activeShops, totalShops: safeZoneShops.length },
      topShops,
      recentOrders,
      ledgerOrders
    };
  }, [orders, zoneShops, timeRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const formatYAxis = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  const handleExportExcel = () => {
    if (!analyticsData.ledgerOrders.length) {
      alert('No data to export for this period.');
      return;
    }

    const excelData = analyticsData.ledgerOrders.map(order => {
      const date = new Date(order.createdAt || order.date || new Date());
      return {
        'Order ID': order.orderNumber || order.id || order._id,
        'Date': date.toLocaleDateString('en-IN'),
        'Time': date.toLocaleTimeString('en-IN'),
        'Delivery Area': order.deliveryAddress?.area || 'N/A',
        'Shops Involved': order.shops?.length || 1,
        'Status': order.status || 'Completed',
        'Revenue (₹)': parseFloat(order.total || order.pricing?.total || 0).toFixed(2)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Zone Revenue Report');
    XLSX.writeFile(workbook, `Zone_Revenue_${timeRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const maxShopOrders = Math.max(...(analyticsData.topShops.map(s => s.orders) || [0]), 1);

  const CustomRevenueTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
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
    }
    return null;
  };

  const getStatusStyle = (status) => {
    const s = status?.toLowerCase();
    if (['completed', 'delivered'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['cancelled', 'failed'].includes(s)) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  if (loading || ordersLoading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-theme-accent-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-theme-text-secondary tracking-wide">Loading zone telemetry...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="w-full h-full flex flex-col gap-6 pb-12">
        {/* Header Controls */}
        <div className="admin-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight">Zone Intelligence</h1>
            <p className="text-sm text-theme-text-secondary mt-1">Real-time macro-revenue telemetry and shop performance.</p>
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
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-theme-accent-primary hover:bg-theme-accent-hover text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <FaFileExcel className="text-sm" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-card rounded-2xl p-6 relative overflow-hidden group hover:border-status-success transition-colors">
            <div className="absolute right-0 top-0 w-24 h-24 bg-status-success/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-status-success/10 text-status-success rounded-xl flex items-center justify-center">
                  <FaRupeeSign className="text-lg" />
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-status-success bg-status-success/10 px-2 py-1 rounded-md">
                  <FaArrowUp className="text-[8px]" /> Active
                </span>
              </div>
              <h3 className="text-3xl font-bold text-theme-text-primary tracking-tight">{formatCurrency(analyticsData.overview.totalRevenue)}</h3>
              <p className="text-sm font-medium text-theme-text-secondary mt-1">Zone Gross Revenue</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="admin-card rounded-2xl p-6 relative overflow-hidden group hover:border-theme-accent-primary transition-colors">
            <div className="absolute right-0 top-0 w-24 h-24 bg-theme-accent-primary/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-theme-accent-primary/10 text-theme-accent-primary rounded-xl flex items-center justify-center">
                  <FaShoppingCart className="text-lg" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-theme-text-primary tracking-tight">{analyticsData.overview.totalOrders.toLocaleString()}</h3>
              <p className="text-sm font-medium text-theme-text-secondary mt-1">Zone Total Volume</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="admin-card rounded-2xl p-6 relative overflow-hidden group hover:border-status-info transition-colors">
            <div className="absolute right-0 top-0 w-24 h-24 bg-status-info/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-status-info/10 text-status-info rounded-xl flex items-center justify-center">
                  <FaStore className="text-lg" />
                </div>
                <span className="text-xs font-bold text-status-info bg-status-info/10 px-2 py-1 rounded-md">
                  {analyticsData.overview.activeShops}/{analyticsData.overview.totalShops} Active
                </span>
              </div>
              <h3 className="text-3xl font-bold text-theme-text-primary tracking-tight">{analyticsData.overview.totalShops}</h3>
              <p className="text-sm font-medium text-theme-text-secondary mt-1">Registered Shops</p>
            </div>
          </motion.div>
        </div>

        {/* Charts & Velocity Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trajectory Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 admin-card rounded-2xl flex flex-col h-[420px]">
            <div className="px-6 py-5 border-b border-theme-border-primary">
              <h3 className="text-base font-bold text-theme-text-primary">Macro Revenue Trajectory</h3>
            </div>

            <div className="p-4 flex-1 w-full h-full">
              {analyticsData.recentOrders.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.recentOrders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorZoneRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2337C6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2337C6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-primary)" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'var(--theme-text-tertiary)', fontWeight: 500 }}
                      dy={10}
                      minTickGap={20}
                    />
                    <YAxis
                      tickFormatter={formatYAxis}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'var(--theme-text-tertiary)', fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomRevenueTooltip />} cursor={{ stroke: 'var(--theme-border-secondary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2337C6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorZoneRevenue)"
                      activeDot={{ r: 6, fill: '#2337C6', stroke: '#ffffff', strokeWidth: 2 }}
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

          {/* Shop Velocity Matrix */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="admin-card rounded-2xl flex flex-col h-[420px]">
            <div className="px-6 py-5 border-b border-theme-border-primary flex justify-between items-center">
              <h3 className="text-base font-bold text-theme-text-primary">Shop Velocity Matrix</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-theme-text-tertiary">Top Performers</span>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {analyticsData.topShops.length > 0 ? (
                <div className="space-y-6">
                  {analyticsData.topShops.slice(0, 10).map((shop, index) => {
                    const widthPercent = maxShopOrders > 0 ? (shop.orders / maxShopOrders) * 100 : 0;
                    return (
                      <div key={shop.id || index} className="relative group">
                        <div className="flex justify-between items-end mb-2 relative z-10">
                          <span className="text-sm font-bold text-theme-text-primary truncate pr-4">{shop.name}</span>
                          <span className="text-xs font-bold text-theme-accent-primary whitespace-nowrap bg-theme-accent-primary/10 px-2 py-0.5 rounded border border-theme-accent-primary/20">
                            {shop.orders} Orders
                          </span>
                        </div>

                        <div className="w-full bg-theme-bg-tertiary rounded-full h-2.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPercent}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                            className="bg-theme-accent-primary h-full rounded-full"
                          ></motion.div>
                        </div>
                        <div className="text-[11px] font-medium text-theme-text-tertiary mt-1.5 flex justify-between">
                          <span>Rank #{index + 1}</span>
                          <span className="text-theme-text-secondary font-bold">{formatCurrency(shop.revenue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-theme-text-tertiary">
                  <FaStore className="text-4xl mb-3 opacity-30" />
                  <p className="font-medium text-sm">No shop velocity data available</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Transaction Ledger */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="admin-card rounded-2xl flex flex-col overflow-hidden flex-1">
          <div className="px-6 py-5 border-b border-theme-border-primary flex justify-between items-center bg-theme-bg-secondary">
            <div>
              <h3 className="text-base font-bold text-theme-text-primary">Zone Transaction Ledger</h3>
              <p className="text-xs text-theme-text-secondary mt-0.5">Detailed breakdown for {timeRange}</p>
            </div>
            <span className="text-xs font-bold text-theme-text-secondary bg-theme-bg-primary px-3 py-1.5 rounded-lg border border-theme-border-primary shadow-sm">
              {analyticsData.ledgerOrders.length} Records
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-bg-secondary border-b border-theme-border-primary text-xs uppercase tracking-wider text-theme-text-tertiary">
                  <th className="px-6 py-4 font-bold">Order ID</th>
                  <th className="px-6 py-4 font-bold">Date & Time</th>
                  <th className="px-6 py-4 font-bold">Delivery Area</th>
                  <th className="px-6 py-4 font-bold text-center">Shops</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border-primary">
                {analyticsData.ledgerOrders.length > 0 ? (
                  analyticsData.ledgerOrders.map((order) => {
                    const orderDate = new Date(order.createdAt || order.date || new Date());
                    const orderTotal = order.pricing?.total || order.totalAmount || order.total || 0;
                    const shopsCount = order.shops?.length || 1;

                    return (
                      <tr key={order.id || order._id} className="hover:bg-theme-bg-hover transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-theme-text-primary whitespace-nowrap">
                          #{order.orderNumber || order.id?.substring(0, 8) || order._id?.substring(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-theme-text-primary">{orderDate.toLocaleDateString('en-IN')}</div>
                          <div className="text-xs text-theme-text-tertiary">{orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-theme-text-secondary font-medium truncate max-w-[150px]">
                          {order.deliveryAddress?.area || order.deliveryAddress?.street || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-theme-text-secondary font-bold text-center">
                          {shopsCount}
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
                      <p className="font-medium text-sm">No zone transactions found for this period.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneAnalytics;