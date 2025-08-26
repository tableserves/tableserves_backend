/**
 * Error Handling Implementation Guide for TableServe Application
 * 
 * This documentation provides comprehensive guidance on using the error handling
 * system implemented in the TableServe application.
 */

// ===== QUICK START GUIDE =====

/**
 * 1. BASIC ERROR HANDLING IN COMPONENTS
 * 
 * Use the useErrorHandler hook for consistent error handling:
 */

import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const { handleError, handleApiError, error, clearError } = useErrorHandler('MyComponent');

  const handleSubmit = async (data) => {
    try {
      const result = await api.submitData(data);
      // Success handling
    } catch (error) {
      handleApiError(error); // Automatically handles API errors
    }
  };

  // Show error if present
  if (error) {
    return (
      <div className="error-display">
        <p>{error.userMessage}</p>
        <button onClick={clearError}>Try Again</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  );
}

/**
 * 2. ASYNC OPERATIONS WITH ERROR HANDLING
 * 
 * Use useAsyncWithErrorHandling for operations that need loading states:
 */

import { useAsyncWithErrorHandling } from '../hooks/useErrorHandler';

function DataFetcher() {
  const {
    loading,
    data,
    execute,
    executeWithRetry,
    error,
    clearError
  } = useAsyncWithErrorHandling(
    async (id) => {
      const response = await api.fetchData(id);
      return response.data;
    },
    {
      component: 'DataFetcher',
      onSuccess: (data) => console.log('Data loaded:', data),
      onError: (error) => console.log('Error occurred:', error),
      retryAttempts: 3
    }
  );

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && (
        <div className="error">
          {error.userMessage}
          <button onClick={() => executeWithRetry('some-id')}>Retry</button>
        </div>
      )}
      {data && <div>Data: {JSON.stringify(data)}</div>}
      <button onClick={() => execute('some-id')}>Fetch Data</button>
    </div>
  );
}

/**
 * 3. FORM VALIDATION WITH ERROR HANDLING
 * 
 * Use useFormValidation for consistent form error handling:
 */

import { useFormValidation } from '../hooks/useErrorHandler';

function ContactForm() {
  const validationRules = {
    name: [
      { required: true, message: 'Name is required' },
      { minLength: 2, message: 'Name must be at least 2 characters' }
    ],
    email: [
      { required: true, message: 'Email is required' },
      { pattern: /\S+@\S+\.\S+/, message: 'Email format is invalid' }
    ],
    phone: [
      { required: true, message: 'Phone is required' },
      { pattern: /^\d{10}$/, message: 'Phone must be 10 digits' }
    ]
  };

  const {
    errors,
    isValid,
    validateForm,
    clearFieldError
  } = useFormValidation(validationRules, 'ContactForm');

  const [formData, setFormData] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm(formData)) {
      // Submit form
      console.log('Form is valid, submitting...');
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearFieldError(field); // Clear error when user starts typing
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="text"
          placeholder="Name"
          onChange={(e) => handleFieldChange('name', e.target.value)}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      
      <div>
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => handleFieldChange('email', e.target.value)}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      
      <button type="submit" disabled={!isValid}>Submit</button>
    </form>
  );
}

/**
 * 4. ERROR BOUNDARIES FOR COMPONENT ISOLATION
 * 
 * Wrap components that might throw errors:
 */

import { ErrorBoundary } from '../components/ErrorBoundary';

function App() {
  return (
    <div>
      <ErrorBoundary
        level="component"
        componentName="UserDashboard"
        onError={(error) => console.log('Dashboard error:', error)}
      >
        <UserDashboard />
      </ErrorBoundary>
      
      <ErrorBoundary level="component" componentName="SideNav">
        <SideNavigation />
      </ErrorBoundary>
    </div>
  );
}

/**
 * 5. NETWORK ERROR HANDLING
 * 
 * Handle network-specific errors and offline states:
 */

import { useNetworkErrorHandler } from '../hooks/useErrorHandler';
import { NetworkErrorDisplay } from '../components/ErrorBoundary';

function NetworkSensitiveComponent() {
  const { isOnline, checkConnection } = useNetworkErrorHandler('NetworkComponent');

  return (
    <div>
      <NetworkErrorDisplay 
        isOnline={isOnline} 
        onRetry={checkConnection}
      />
      {isOnline ? (
        <div>Online content</div>
      ) : (
        <div>Offline mode - limited functionality</div>
      )}
    </div>
  );
}

// ===== ADVANCED USAGE PATTERNS =====

/**
 * 6. CUSTOM ERROR TYPES AND BUSINESS LOGIC ERRORS
 */

import errorHandlingService, { ERROR_TYPES, ERROR_CODES } from '../services/ErrorHandlingService';

function BusinessLogicComponent() {
  const { handleBusinessError } = useErrorHandler('BusinessLogic');

  const addVendor = async (vendorData) => {
    try {
      // Check business rules
      const currentVendorCount = await api.getVendorCount();
      const subscriptionLimit = await api.getSubscriptionLimit();
      
      if (currentVendorCount >= subscriptionLimit) {
        // Handle business logic error
        handleBusinessError('ADD_VENDOR', 'VENDOR_LIMIT_EXCEEDED', {
          currentCount: currentVendorCount,
          limit: subscriptionLimit
        });
        return;
      }
      
      const result = await api.addVendor(vendorData);
      return result;
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <button onClick={() => addVendor(someData)}>
      Add Vendor
    </button>
  );
}

/**
 * 7. GLOBAL ERROR MONITORING AND REPORTING
 */

import { useErrorMonitoring } from '../hooks/useErrorHandler';

function AdminErrorDashboard() {
  const {
    errorStats,
    errorHistory,
    refreshStats,
    clearHistory
  } = useErrorMonitoring();

  return (
    <div className="error-dashboard">
      <h2>Error Monitoring</h2>
      
      {errorStats && (
        <div className="stats">
          <p>Total Errors: {errorStats.total}</p>
          <p>Critical Errors: {errorStats.bySeverity.CRITICAL || 0}</p>
          <p>Network Errors: {errorStats.byType.NETWORK || 0}</p>
        </div>
      )}
      
      <div className="actions">
        <button onClick={refreshStats}>Refresh</button>
        <button onClick={clearHistory}>Clear History</button>
      </div>
      
      <div className="recent-errors">
        <h3>Recent Errors</h3>
        {errorStats?.recent?.map((error, index) => (
          <div key={index} className="error-item">
            <strong>{error.type}</strong>: {error.message}
            <small>{error.timestamp}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 8. RTK QUERY INTEGRATION
 */

import { useCreateRestaurantMutation } from '../store/api';

function RestaurantForm() {
  const { handleApiError } = useErrorHandler('RestaurantForm');
  const [createRestaurant, { isLoading, error }] = useCreateRestaurantMutation();

  const handleSubmit = async (restaurantData) => {
    try {
      const result = await createRestaurant(restaurantData).unwrap();
      console.log('Restaurant created:', result);
    } catch (error) {
      // RTK Query errors can be handled the same way
      handleApiError(error);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(formData);
    }}>
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Restaurant'}
      </button>
    </form>
  );
}

// ===== ERROR HANDLING BEST PRACTICES =====

/**
 * BEST PRACTICES:
 * 
 * 1. ALWAYS USE COMPONENT-SPECIFIC ERROR HANDLERS
 *    - Pass the component name to useErrorHandler
 *    - This helps with debugging and error tracking
 * 
 * 2. HANDLE API ERRORS CONSISTENTLY
 *    - Use handleApiError for all API calls
 *    - Don't mix manual error handling with the service
 * 
 * 3. PROVIDE MEANINGFUL USER MESSAGES
 *    - Business errors should have clear user messages
 *    - Use the userMessage property for display
 * 
 * 4. IMPLEMENT RECOVERY ACTIONS
 *    - Provide retry buttons for recoverable errors
 *    - Clear errors when user takes action
 * 
 * 5. USE ERROR BOUNDARIES STRATEGICALLY
 *    - Wrap major sections/pages with error boundaries
 *    - Don't wrap every small component
 * 
 * 6. LOG ERRORS APPROPRIATELY
 *    - Critical errors should be logged immediately
 *    - Include context information for debugging
 * 
 * 7. TEST ERROR SCENARIOS
 *    - Test network failures
 *    - Test validation failures
 *    - Test business logic violations
 */

// ===== ERROR CODES REFERENCE =====

/**
 * COMMON ERROR CODES:
 * 
 * Authentication (1000-1099):
 * - 1001: INVALID_CREDENTIALS
 * - 1002: TOKEN_EXPIRED
 * - 1003: UNAUTHORIZED_ACCESS
 * 
 * Validation (1100-1199):
 * - 1101: REQUIRED_FIELD_MISSING
 * - 1102: INVALID_EMAIL_FORMAT
 * - 1103: INVALID_PHONE_FORMAT
 * 
 * Business Logic (1200-1299):
 * - 1201: VENDOR_LIMIT_EXCEEDED
 * - 1202: TABLE_LIMIT_EXCEEDED
 * - 1203: INSUFFICIENT_SUBSCRIPTION
 * 
 * Network (1300-1399):
 * - 1301: NETWORK_ERROR
 * - 1302: API_TIMEOUT
 * - 1303: SERVER_ERROR
 * 
 * Data (1400-1499):
 * - 1401: DATA_NOT_FOUND
 * - 1402: DATA_CORRUPTED
 * - 1403: STORAGE_FULL
 */

// ===== TESTING ERROR HANDLING =====

/**
 * TESTING EXAMPLES:
 */

// Test API error handling
async function testApiError() {
  const { handleApiError } = useErrorHandler('Test');
  
  try {
    // Simulate API error
    throw {
      response: {
        status: 401,
        data: { message: 'Unauthorized' }
      }
    };
  } catch (error) {
    handleApiError(error);
  }
}

// Test network error
async function testNetworkError() {
  const { handleError } = useErrorHandler('Test');
  
  const networkError = errorHandlingService.createError({
    code: ERROR_CODES.NETWORK_ERROR,
    type: ERROR_TYPES.NETWORK,
    severity: ERROR_SEVERITY.HIGH,
    message: 'Network connection failed',
    component: 'Test'
  });
  
  handleError(networkError);
}

// Test form validation
function testFormValidation() {
  const rules = {
    email: [
      { required: true },
      { pattern: /\S+@\S+\.\S+/ }
    ]
  };
  
  const { validateForm } = useFormValidation(rules, 'Test');
  
  // Should fail validation
  const isValid = validateForm({ email: 'invalid-email' });
  console.log('Validation result:', isValid);
}

export {
  // Components and hooks for external use
  useErrorHandler,
  useAsyncWithErrorHandling,
  useFormValidation,
  useErrorMonitoring,
  useNetworkErrorHandler,
  ErrorBoundary,
  
  // Test functions
  testApiError,
  testNetworkError,
  testFormValidation
};