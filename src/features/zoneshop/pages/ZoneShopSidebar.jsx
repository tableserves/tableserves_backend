import { useState, useEffect } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FaTachometerAlt,
  FaUser,
  FaUtensils,
  FaShoppingCart,
  FaChartBar,
  FaChevronDown,
  FaChevronRight,
  FaComments,
  FaStore,
  FaClipboardList,
  FaHistory,
  FaList
} from 'react-icons/fa';

const ZoneShopSidebar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const location = useLocation();
  const { zoneId, shopId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);

  const getShopProfile = () => {
    try {
      const profileData = localStorage.getItem(`shop_profile_${shopId}`);
      if (profileData) return JSON.parse(profileData);

      const shops = localStorage.getItem('tableserve_shops');
      if (shops) {
        const shopsList = JSON.parse(shops);
        return shopsList.find(s => s.id == shopId) || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const [shopProfile, setShopProfile] = useState(getShopProfile());
  const [expandedSections, setExpandedSections] = useState({
    menu: false,
    orders: false
  });

  const effectiveZoneId = zoneId || user?.zoneId;

  useEffect(() => {
    const refreshProfile = () => setShopProfile(getShopProfile());
    refreshProfile();

    const handleProfileUpdate = (event) => {
      if (event.detail.shopId === shopId) refreshProfile();
    };

    window.addEventListener('shopProfileUpdated', handleProfileUpdate);
    const interval = setInterval(refreshProfile, 5000); 

    return () => {
      clearInterval(interval);
      window.removeEventListener('shopProfileUpdated', handleProfileUpdate);
    };
  }, [shopId]);

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile, setSidebarOpen]);

  // Expand relevant section if a sub-route is active on load
  useEffect(() => {
    if (location.pathname.includes('/menu/')) setExpandedSections(prev => ({ ...prev, menu: true }));
    if (location.pathname.includes('/orders/')) setExpandedSections(prev => ({ ...prev, orders: true }));
  }, [location.pathname]);

  const toggleSection = (section) => {
    // If sidebar is collapsed, clicking a folder should open the sidebar AND expand the folder
    if (!isMobile && !sidebarOpen) {
      setSidebarOpen(true);
      setExpandedSections(prev => ({ ...prev, [section]: true }));
      return;
    }
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavClick = () => {
    if (isMobile) setSidebarOpen(false);
  };

  const getPath = (path) => {
    const zoneIdToUse = effectiveZoneId || user?.zoneId || 'unknown';
    return `/zone/${zoneIdToUse}/shop/${shopId}${path}`;
  };

  const menuSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: FaTachometerAlt,
      path: getPath('/dashboard'),
      single: true
    },
    {
      id: 'menu',
      title: 'Menu Management',
      icon: FaUtensils,
      items: [
        { path: getPath('/menu/categories'), label: 'Categories', icon: FaList },
        { path: getPath('/menu/items'), label: 'Menu Items', icon: FaUtensils },
      ]
    },
    {
      id: 'orders',
      title: 'Order Management',
      icon: FaShoppingCart,
      items: [
        { path: getPath('/orders/live'), label: 'Live Orders', icon: FaShoppingCart },
        { path: getPath('/orders/history'), label: 'Order History', icon: FaHistory }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: FaChartBar,
      path: getPath('/analytics/revenue'),
      single: true
    },
    {
      id: 'feedback',
      title: 'Customer Feedback',
      icon: FaComments,
      path: getPath('/reviews'),
      single: true
    },
    {
      id: 'profile',
      title: 'Settings',
      icon: FaUser,
      path: getPath('/profile'),
      single: true
    },
  ];

  const isSectionActive = (items) => items?.some(item => location.pathname.startsWith(item.path));

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-theme-bg-secondary border-r border-theme-border-primary z-40 flex flex-col transition-all duration-300 ease-in-out theme-transition ${
        isMobile ? (sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full') : 'translate-x-0'
      }`}
      style={{
        width: sidebarOpen ? '16rem' : '5rem', // 5rem = 80px (w-20 in tailwind) to match layout ml-20
        paddingTop: 'var(--navbar-height, 6rem)'
      }}
    >
      {/* Brand / Logo Area */}
      <div className="p-4 border-b border-theme-border-primary flex items-center h-[72px] shrink-0">
        <div className="flex items-center w-full">
          <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-theme-bg-tertiary border border-theme-border-primary flex items-center justify-center">
            {shopProfile?.profilePicture ? (
              <img
                src={shopProfile.profilePicture}
                alt={shopProfile?.shopName || 'Shop'}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <FaStore className="text-accent text-lg" />
            )}
          </div>
          
          <div 
            className={`ml-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
              sidebarOpen ? 'w-[150px] opacity-100' : 'w-0 opacity-0'
            }`}
          >
            <h2 className="text-sm font-bold text-theme-text-primary truncate">
              {shopProfile?.shopName || user?.shopName || 'Dashboard'}
            </h2>
            <p className="text-xs font-medium text-theme-text-secondary uppercase tracking-wider">Shop Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation Scrollable Area */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide">
        <div className="space-y-1.5 px-3">
          {menuSections.map((section) => {
            const SectionIcon = section.icon;
            
            return (
              <div key={section.id}>
                {section.single ? (
                  <NavLink
                    to={section.path}
                    onClick={handleNavClick}
                    title={!sidebarOpen ? section.title : undefined}
                    className={({ isActive }) => `
                      relative flex items-center h-11 px-3 rounded-xl transition-all duration-200 group
                      ${isActive 
                        ? 'bg-accent text-white shadow-md shadow-orange-900/10' 
                        : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                      }
                    `}
                  >
                    <div className="flex items-center justify-center w-6 shrink-0">
                      <SectionIcon className="text-[18px]" />
                    </div>
                    <span 
                      className={`ml-3 font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                        sidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0'
                      }`}
                    >
                      {section.title}
                    </span>
                  </NavLink>
                ) : (
                  <div>
                    <button
                      onClick={() => toggleSection(section.id)}
                      title={!sidebarOpen ? section.title : undefined}
                      className={`
                        w-full relative flex items-center justify-between h-11 px-3 rounded-xl transition-all duration-200 group
                        ${isSectionActive(section.items)
                          ? 'bg-accent/10 text-accent'
                          : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-6 shrink-0">
                          <SectionIcon className="text-[18px]" />
                        </div>
                        <span 
                          className={`ml-3 font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                            sidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0'
                          }`}
                        >
                          {section.title}
                        </span>
                      </div>
                      
                      <div className={`overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-4 opacity-100' : 'w-0 opacity-0'}`}>
                        {expandedSections[section.id] ? (
                          <FaChevronDown className="text-[10px]" />
                        ) : (
                          <FaChevronRight className="text-[10px]" />
                        )}
                      </div>
                    </button>

                    {/* Sub-menu items */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedSections[section.id] && sidebarOpen ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="pl-11 pr-2 py-1 space-y-1 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-[1px] before:bg-theme-border-secondary">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              onClick={handleNavClick}
                              className={({ isActive }) => `
                                flex items-center h-9 px-3 rounded-lg transition-colors text-sm font-medium
                                ${isActive
                                  ? 'bg-theme-bg-hover text-accent'
                                  : 'text-theme-text-tertiary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                                }
                              `}
                            >
                              <ItemIcon className="text-[14px] mr-2.5 opacity-70" />
                              <span className="whitespace-nowrap">{item.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

export default ZoneShopSidebar;
