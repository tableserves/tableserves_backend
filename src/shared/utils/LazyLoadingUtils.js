import { lazy, Suspense, Component } from 'react';
import { logger } from '../logging/logger';

/**
 * Production-ready lazy loading utility with error boundaries
 */

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }) => (
  <div className=\"flex items-center justify-center min-h-[200px]\">\n    <div className=\"flex flex-col items-center space-y-4\">\n      <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600\"></div>\n      <p className=\"text-gray-600 text-sm\">{message}</p>\n    </div>\n  </div>\n);

// Error fallback component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Lazy component loading error', error, 'LazyLoading');
    logger.debug('Error info', errorInfo, 'LazyLoading');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className=\"flex items-center justify-center min-h-[200px] bg-red-50 border border-red-200 rounded-lg\">\n          <div className=\"text-center p-6\">\n            <div className=\"text-red-600 mb-2\">\n              <svg className=\"w-12 h-12 mx-auto\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 8.5c-.77.833.192 2.5 1.732 2.5z\" />\n              </svg>\n            </div>\n            <h3 className=\"text-lg font-medium text-red-800 mb-2\">Component Failed to Load</h3>\n            <p className=\"text-red-600 text-sm mb-4\">There was an error loading this component.</p>\n            <button \n              onClick={() => window.location.reload()}\n              className=\"px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors\"\n            >\n              Reload Page\n            </button>\n          </div>\n        </div>\n      );
    }

    return this.props.children;
  }
}

/**
 * Create a lazy-loaded component with enhanced error handling
 */
export const createLazyComponent = (importFn, options = {}) => {
  const {
    fallback = <LoadingFallback />,
    errorFallback,
    retryCount = 3,
    retryDelay = 1000,
    componentName = 'UnknownComponent'
  } = options;

  // Wrapper for import function with retry logic
  const importWithRetry = async (attempt = 1) => {
    try {
      logger.perfStart(`lazy-load-${componentName}`);
      const module = await importFn();
      const duration = logger.perfEnd(`lazy-load-${componentName}`);
      
      logger.debug(`Lazy component loaded: ${componentName}`, { 
        duration, 
        attempt 
      }, 'LazyLoading');
      
      return module;
    } catch (error) {
      logger.error(`Lazy loading failed for ${componentName} (attempt ${attempt})`, error, 'LazyLoading');
      
      if (attempt < retryCount) {
        logger.info(`Retrying lazy load for ${componentName}`, { 
          attempt: attempt + 1, 
          delay: retryDelay 
        }, 'LazyLoading');
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return importWithRetry(attempt + 1);
      }
      
      throw new Error(`Failed to load ${componentName} after ${retryCount} attempts: ${error.message}`);
    }
  };

  const LazyComponent = lazy(importWithRetry);

  // Return wrapped component with error boundary
  return (props) => (
    <ErrorBoundary errorFallback={errorFallback}>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Preload a lazy component
 */
export const preloadComponent = (importFn, componentName = 'UnknownComponent') => {
  return importFn().then(module => {
    logger.debug(`Component preloaded: ${componentName}`, {}, 'LazyLoading');
    return module;
  }).catch(error => {
    logger.error(`Failed to preload component: ${componentName}`, error, 'LazyLoading');
    throw error;
  });
};

/**
 * Route-based lazy loading with enhanced features
 */
export const createLazyRoute = (importFn, options = {}) => {
  const {
    preload = false,
    componentName,
    fallback = <LoadingFallback message=\"Loading page...\" />
  } = options;

  const component = createLazyComponent(importFn, {
    ...options,
    fallback,
    componentName: componentName || 'RouteComponent'
  });

  // Preload if requested
  if (preload) {
    // Preload after a short delay to avoid blocking initial render
    setTimeout(() => {
      preloadComponent(importFn, componentName);
    }, 100);
  }

  return component;
};

/**
 * Conditional lazy loading based on feature flags
 */
export const createConditionalLazyComponent = (importFn, condition, fallbackComponent, options = {}) => {
  if (condition) {
    return createLazyComponent(importFn, options);
  }
  
  return fallbackComponent || (() => null);
};

/**
 * Lazy load with intersection observer for viewport-based loading
 */
export const createViewportLazyComponent = (importFn, options = {}) => {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    componentName = 'ViewportComponent',
    placeholder = <div className=\"min-h-[200px] bg-gray-100 animate-pulse rounded-lg\"></div>
  } = options;

  return (props) => {
    const [shouldLoad, setShouldLoad] = useState(false);
    const [isIntersecting, setIsIntersecting] = useState(false);
    const elementRef = useRef(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !shouldLoad) {
            setShouldLoad(true);
            setIsIntersecting(true);
            logger.debug(`Viewport lazy loading triggered: ${componentName}`, {}, 'LazyLoading');
          }
        },
        { rootMargin, threshold }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => {
        if (elementRef.current) {
          observer.unobserve(elementRef.current);
        }
      };
    }, []);

    if (!shouldLoad) {
      return <div ref={elementRef}>{placeholder}</div>;
    }

    const LazyComponent = createLazyComponent(importFn, {
      ...options,
      componentName
    });

    return <LazyComponent {...props} />;
  };
};

/**
 * Bundle analyzer helper for development
 */
export const analyzeBundleSize = (componentName, importFn) => {
  if (import.meta.env.DEV) {
    return async () => {
      const start = performance.now();
      const module = await importFn();
      const loadTime = performance.now() - start;
      
      logger.debug(`Bundle analysis for ${componentName}`, {
        loadTime,
        moduleKeys: Object.keys(module),
        defaultExport: !!module.default
      }, 'BundleAnalyzer');
      
      return module;
    };
  }
  
  return importFn;
};

// Pre-defined lazy components for common patterns
export const LazyComponents = {
  // Admin components
  AdminDashboard: createLazyRoute(
    () => import('@/pages/admin/AdminDashboard'),
    { componentName: 'AdminDashboard', preload: false }
  ),
  
  // Owner components
  OwnerDashboard: createLazyRoute(
    () => import('@/pages/owner/OwnerDashboard'),
    { componentName: 'OwnerDashboard', preload: false }
  ),
  
  // Customer components
  MenuView: createLazyRoute(
    () => import('@/pages/customer/restaurant/RestaurantMenuScreen'),
    { componentName: 'MenuView', preload: true }
  ),

  OrderTracking: createLazyRoute(
    () => import('@/features/consumer/components/common/OrderTracking'),
    { componentName: 'OrderTracking', preload: true }
  ),
  
  // Zone components
  ZoneAdminDashboard: createLazyRoute(
    () => import('@/pages/zone_user/ZoneAdminDashboard'),
    { componentName: 'ZoneAdminDashboard', preload: false }
  ),
  
  // Heavy components with viewport loading
  Reports: createViewportLazyComponent(
    () => import('@/components/common/Reports'),
    { componentName: 'Reports' }
  ),
  
  Analytics: createViewportLazyComponent(
    () => import('@/components/common/Analytics'),
    { componentName: 'Analytics' }
  )
};

export default {
  createLazyComponent,
  createLazyRoute,
  createConditionalLazyComponent,
  createViewportLazyComponent,
  preloadComponent,
  analyzeBundleSize,
  LazyComponents
};