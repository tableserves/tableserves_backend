import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaCrown
} from 'react-icons/fa';
import { logout } from '../../../store/slices/uiSlice';
import ThemeToggle from '../../../components/common/ThemeToggle';
import DatabaseService from '../../../services/DatabaseService';
import logo from '../../../assets/logo.svg';

const ZoneAdminNavbar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { zoneId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);
  
  const [showProfile, setShowProfile] = useState(false);
  const [zoneData, setZoneData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [planType, setPlanType] = useState('free'); // 'free', 'basic', 'advanced', 'premium'

  useEffect(() => {
    const fetchZoneData = async () => {
      if (!zoneId) return;
      try {
        setDataLoading(true);
        const data = await DatabaseService.getZone(zoneId);
        setZoneData(data);
        
        // Determine plan type
        if (data) {
          const subscription = data.subscription || data.subscriptionPlan;
          if (subscription) {
            if (subscription === 'premium' || subscription.key === 'premium' || subscription.planKey?.includes('premium')) {
              setPlanType('premium');
            } else if (subscription === 'advanced' || subscription.key === 'advanced' || subscription.planKey?.includes('advanced')) {
              setPlanType('advanced');
            } else if (subscription === 'basic' || subscription.key === 'basic' || subscription.planKey?.includes('basic')) {
              setPlanType('basic');
            } else {
              setPlanType('free');
            }
          } else {
            setPlanType('free');
          }
        }
      } catch (error) {
        console.error('Error fetching zone:', error);
        setPlanType('free');
      } finally {
        setDataLoading(false);
      }
    };
    fetchZoneData();
  }, [zoneId]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Get plan badge configuration
  const getPlanBadge = () => {
    switch (planType) {
      case 'premium':
        return {
          label: 'Premium',
          icon: FaCrown,
          bgClass: 'bg-gradient-to-r from-purple-500/20 to-indigo-600/20',
          borderClass: 'border-purple-400/30',
          textClass: 'text-purple-300',
          iconClass: 'text-yellow-300'
        };
      case 'advanced':
        return {
          label: 'Advanced',
          bgClass: 'bg-gradient-to-r from-blue-500/20 to-cyan-600/20',
          borderClass: 'border-blue-400/30',
          textClass: 'text-blue-300'
        };
      case 'basic':
        return {
          label: 'Basic',
          bgClass: 'bg-gradient-to-r from-green-500/20 to-emerald-600/20',
          borderClass: 'border-green-400/30',
          textClass: 'text-green-300'
        };
      default:
        return {
          label: 'Free',
          bgClass: 'bg-theme-bg-tertiary',
          borderClass: 'border-theme-border',
          textClass: 'text-theme-text-tertiary'
        };
    }
  };

  const planBadge = getPlanBadge();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 right-0 left-0 z-50 border-b border-theme-border-primary bg-theme-bg-primary/80 backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-4 sm:px-8 h-20">
        
        {/* Left: Sidebar Toggle & Zone Branding */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2.5 rounded-xl text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-accent-primary transition-all"
          >
            <FaBars size={20} />
          </button>

          <div className="hidden md:flex items-center space-x-3 pl-4 border-l border-theme-border-primary">
            <div className="w-10 h-10 bg-theme-accent-primary/10 rounded-xl flex items-center justify-center">
              <img src={logo} alt="Zone" className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-theme-text-primary leading-tight">
                {dataLoading ? 'Loading...' : (zoneData?.name || user?.zoneName || 'Main Zone')}
                <span className="text-[10px] uppercase tracking-widest font-bold text-theme-text-tertiary pl-2">
                Food Zone
              </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Center: Branding */}
        <div className="flex items-center font-cinzel font-bold text-xl sm:text-2xl text-theme-accent-primary">
          <img src={logo} alt="logo" className="h-8 w-8 sm:h-10 sm:w-10 mr-2" />
          <span className="hidden sm:inline">TableServes</span>
        </div>

        {/* Right Section: Tools and Profile */}
        <div className="flex items-center space-x-2 sm:space-x-5">
          {/* Plan Badge */}
          {!dataLoading && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => navigate(`/zone/${zoneId}/upgrade`)}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${planBadge.borderClass} ${planBadge.bgClass} backdrop-blur-sm transition-all hover:scale-105 hover:shadow-lg`}
            >
              {planBadge.icon && <planBadge.icon className={`${planBadge.iconClass || planBadge.textClass} text-xs`} />}
              <span className={`text-xs font-bold uppercase tracking-wider ${planBadge.textClass}`}>
                {planBadge.label}
              </span>
            </motion.button>
          )}

          <ThemeToggle variant="icon-only" />

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-3 p-1.5 pr-3 rounded-xl hover:bg-theme-bg-hover transition-all border border-transparent hover:border-theme-border-primary"
            >
              <div className="relative w-9 h-9 rounded-lg bg-theme-accent-white flex items-center justify-center shadow-lg">
                <img src={logo} alt="Zone" className="w-6 h-6" />
                {planType === 'premium' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg border border-white">
                    <FaCrown className="w-2 h-2 text-yellow-300" />
                  </div>
                )}
              </div>
              {!isMobile && (
                <div className="text-left">
                  <p className="text-xs font-bold text-theme-text-primary truncate max-w-[100px] leading-none">
                    {user?.name || 'Admin'}
                  </p>
                  <span className="text-[10px] text-theme-text-tertiary font-medium">Zone Admin</span>
                </div>
              )}
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-64 bg-theme-bg-primary border border-theme-border-primary rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-5 bg-theme-bg-secondary/50 border-b border-theme-border-primary">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-12 h-12 rounded-xl bg-theme-accent-primary flex items-center justify-center text-white font-bold text-xl">
                        {user?.name?.charAt(0) || 'A'}
                        {planType === 'premium' && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                            <FaCrown className="w-2.5 h-2.5 text-yellow-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-theme-text-primary truncate">{user?.name}</p>
                        <p className="text-[10px] text-theme-accent-primary uppercase font-black tracking-widest mt-0.5">Zone Admin</p>
                      </div>
                    </div>
                    
                    {/* Plan Badge in Dropdown */}
                    {!dataLoading && (
                      <div className={`mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${planBadge.borderClass} ${planBadge.bgClass}`}>
                        {planBadge.icon && <planBadge.icon className={`${planBadge.iconClass || planBadge.textClass} text-sm`} />}
                        <span className={`text-xs font-bold uppercase tracking-wider ${planBadge.textClass}`}>
                          {planBadge.label} Plan
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2">
                    <button
                      onClick={() => navigate(`/zone/${zoneId}/profile`)}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-theme-text-secondary hover:text-theme-accent-primary hover:bg-theme-accent-primary/5 rounded-xl transition-all"
                    >
                      <FaUser size={14} />
                      <span className="font-medium">Zone Profile</span>
                    </button>
                    <button
                      onClick={() => navigate(`/zone/${zoneId}/settings`)}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-theme-text-secondary hover:text-theme-accent-primary hover:bg-theme-accent-primary/5 rounded-xl transition-all"
                    >
                      <FaCog size={14} />
                      <span className="font-medium">Zone Settings</span>
                    </button>
                    
                    {/* Upgrade Plan Button - Only show if not premium */}
                    {planType !== 'premium' && (
                      <>
                        <div className="h-px bg-theme-border-primary my-2 mx-2" />
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            navigate(`/zone/${zoneId}/upgrade`);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl transition-all"
                        >
                          <FaCrown size={14} />
                          <span className="font-medium">Upgrade Plan</span>
                        </button>
                      </>
                    )}
                    
                    <div className="h-px bg-theme-border-primary my-2 mx-2" />
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-status-error hover:bg-status-error/10 rounded-xl transition-all"
                    >
                      <FaSignOutAlt size={14} />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Global Backdrop for dropdown */}
      {showProfile && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setShowProfile(false)} 
        />
      )}
    </motion.nav>
  );
};

export default ZoneAdminNavbar;