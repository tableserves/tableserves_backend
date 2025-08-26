import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSun, FaMoon, FaDesktop } from 'react-icons/fa';
import { 
  toggleTheme, 
  setTheme, 
  finishThemeTransition, 
  initializeTheme,
  selectTheme, 
  selectIsThemeTransitioning 
} from '../../store/slices/uiSlice';

const ThemeToggle = ({ 
  variant = 'default', // 'default', 'compact', 'icon-only'
  showLabel = true,
  className = ''
}) => {
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectTheme);
  const isTransitioning = useSelector(selectIsThemeTransitioning);

  // Initialize theme on component mount
  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  // Handle transition completion
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        dispatch(finishThemeTransition());
      }, 300); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, dispatch]);

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  const handleSetTheme = (theme) => {
    dispatch(setTheme(theme));
  };

  // Icon variants
  const iconVariants = {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit: { scale: 0, rotate: 180, opacity: 0 }
  };

  // Button variants based on theme
  const getButtonClasses = () => {
    const baseClasses = `
      relative flex items-center justify-center
      transition-all duration-300 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      focus:ring-theme-accent-primary focus:ring-offset-theme-bg-primary
    `;

    switch (variant) {
      case 'compact':
        return `${baseClasses} w-10 h-10 rounded-lg bg-theme-bg-secondary hover:bg-theme-bg-hover border border-theme-border-primary`;
      
      case 'icon-only':
        return `${baseClasses} w-8 h-8 rounded-md bg-transparent hover:bg-theme-bg-hover`;
      
      default:
        return `${baseClasses} px-3 py-2 rounded-lg bg-theme-bg-secondary hover:bg-theme-bg-hover border border-theme-border-primary`;
    }
  };

  const getIconSize = () => {
    switch (variant) {
      case 'compact':
        return 'w-5 h-5';
      case 'icon-only':
        return 'w-4 h-4';
      default:
        return 'w-4 h-4';
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <div className="space-y-1">
          <button
            onClick={() => handleSetTheme('light')}
            className={`
              w-full flex items-center px-3 py-2 text-sm rounded-md
              transition-colors duration-200
              ${currentTheme === 'light' 
                ? 'bg-theme-accent-primary text-theme-text-inverse' 
                : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
              }
            `}
          >
            <FaSun className="w-4 h-4 mr-3" />
            Light Mode
          </button>
          
          <button
            onClick={() => handleSetTheme('dark')}
            className={`
              w-full flex items-center px-3 py-2 text-sm rounded-md
              transition-colors duration-200
              ${currentTheme === 'dark' 
                ? 'bg-theme-accent-primary text-theme-text-inverse' 
                : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
              }
            `}
          >
            <FaMoon className="w-4 h-4 mr-3" />
            Dark Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      onClick={handleToggle}
      className={`${getButtonClasses()} ${className}`}
      whileTap={{ scale: 0.95 }}
      disabled={isTransitioning}
      title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="flex items-center space-x-2">
        {/* Icon with animation */}
        <div className="relative">
          <AnimatePresence>
            <motion.div
              key={currentTheme}
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className={`${getIconSize()} text-theme-text-primary`}
            >
              {currentTheme === 'dark' ? (
                <FaSun className="w-full h-full" />
              ) : (
                <FaMoon className="w-full h-full" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Label */}
        {showLabel && variant !== 'icon-only' && (
          <span className="text-sm font-medium text-theme-text-primary">
            {currentTheme === 'dark' ? 'Light' : 'Dark'}
          </span>
        )}
      </div>

      {/* Loading indicator */}
      {isTransitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-theme-bg-secondary rounded-lg"
        >
          <div className="w-4 h-4 border-2 border-theme-accent-primary border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}
    </motion.button>
  );
};

// Enhanced theme toggle with system preference option
export const AdvancedThemeToggle = ({ className = '' }) => {
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectTheme);
  const [showDropdown, setShowDropdown] = React.useState(false);

  const themes = [
    { id: 'light', label: 'Light', icon: FaSun },
    { id: 'dark', label: 'Dark', icon: FaMoon },
    { id: 'system', label: 'System', icon: FaDesktop }
  ];

  const currentThemeData = themes.find(t => t.id === currentTheme) || themes[1];

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-theme-bg-secondary hover:bg-theme-bg-hover border border-theme-border-primary transition-colors duration-200"
        whileTap={{ scale: 0.95 }}
      >
        <currentThemeData.icon className="w-4 h-4 text-theme-text-primary" />
        <span className="text-sm font-medium text-theme-text-primary">
          {currentThemeData.label}
        </span>
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-theme-bg-card border border-theme-border-primary rounded-lg shadow-lg z-20 overflow-hidden"
            >
              <ThemeToggle variant="dropdown" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle;
