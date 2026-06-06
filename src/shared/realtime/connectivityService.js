import { healthAPI, authAPI, adminAPI, restaurantAPI, orderAPI, zoneAPI } from './api';

/**
 * Comprehensive connectivity testing service
 * Tests all aspects of frontend-backend integration
 */

export class ConnectivityService {
  constructor() {
    this.testResults = new Map();
    this.isRunning = false;
  }

  /**
   * Run a single test with error handling
   */
  async runTest(testName, testFunction, description = '') {
    this.testResults.set(testName, {
      status: 'running',
      message: 'Testing...',
      startTime: Date.now()
    });

    try {
      const result = await testFunction();
      const duration = Date.now() - this.testResults.get(testName).startTime;
      
      this.testResults.set(testName, {
        status: 'success',
        message: result.message || 'Test passed',
        data: result.data,
        duration,
        description
      });

      return { success: true, result };
    } catch (error) {
      const duration = Date.now() - this.testResults.get(testName).startTime;
      
      this.testResults.set(testName, {
        status: 'error',
        message: error.message || 'Test failed',
        error: error.response?.data || error,
        duration,
        description
      });

      return { success: false, error };
    }
  }

  /**
   * Test basic backend connectivity
   */
  async testBackendConnectivity() {
    const result = await healthAPI.connectivity();
    return {
      message: 'Backend connectivity successful',
      data: result.data
    };
  }

  /**
   * Test database connectivity
   */
  async testDatabaseConnectivity() {
    const result = await healthAPI.detailed();
    
    if (result.data.dependencies.database.status !== 'connected') {
      throw new Error(`Database status: ${result.data.dependencies.database.status}`);
    }

    return {
      message: 'Database connectivity successful',
      data: result.data.dependencies.database
    };
  }

  /**
   * Test authentication endpoints
   */
  async testAuthEndpoints() {
    const authTest = await authAPI.test();
    const jwtTest = await authAPI.testJWT();

    return {
      message: 'Authentication endpoints accessible',
      data: {
        authTest: authTest.data,
        jwtTest: jwtTest.data
      }
    };
  }

  /**
   * Test admin endpoints (should return 401 without auth)
   */
  async testAdminEndpoints() {
    try {
      await adminAPI.getDashboard();
      throw new Error('Admin endpoint should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          message: 'Admin endpoints properly protected (401 Unauthorized)',
          data: { authRequired: true }
        };
      }
      throw error;
    }
  }

  /**
   * Test restaurant endpoints
   */
  async testRestaurantEndpoints() {
    try {
      await restaurantAPI.getAll();
      throw new Error('Restaurant endpoint should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          message: 'Restaurant endpoints properly protected (401 Unauthorized)',
          data: { authRequired: true }
        };
      }
      throw error;
    }
  }

  /**
   * Test CORS configuration
   */
  async testCORSConfiguration() {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error(`CORS test failed: ${response.status} ${response.statusText}`);
      }

      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
      };

      return {
        message: 'CORS configuration working correctly',
        data: corsHeaders
      };
    } catch (error) {
      throw new Error(`CORS configuration error: ${error.message}`);
    }
  }

  /**
   * Test WebSocket connectivity
   */
  async testWebSocketConnectivity() {
    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(`ws://localhost:5000/socket.io/?EIO=4&transport=websocket`);
        
        const timeout = setTimeout(() => {
          socket.close();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        socket.onopen = () => {
          clearTimeout(timeout);
          socket.close();
          resolve({
            message: 'WebSocket connectivity successful',
            data: { protocol: 'websocket', transport: 'socket.io' }
          });
        };

        socket.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket connection failed: ${error.message}`));
        };
      } catch (error) {
        reject(new Error(`WebSocket test error: ${error.message}`));
      }
    });
  }

  /**
   * Run all connectivity tests
   */
  async runAllTests() {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    this.testResults.clear();

    const tests = [
      {
        name: 'backend',
        function: () => this.testBackendConnectivity(),
        description: 'Basic backend server connectivity'
      },
      {
        name: 'database',
        function: () => this.testDatabaseConnectivity(),
        description: 'Database connection and health'
      },
      {
        name: 'auth',
        function: () => this.testAuthEndpoints(),
        description: 'Authentication endpoint accessibility'
      },
      {
        name: 'cors',
        function: () => this.testCORSConfiguration(),
        description: 'Cross-Origin Resource Sharing configuration'
      },
      {
        name: 'admin',
        function: () => this.testAdminEndpoints(),
        description: 'Admin endpoint security'
      },
      {
        name: 'restaurants',
        function: () => this.testRestaurantEndpoints(),
        description: 'Restaurant endpoint security'
      },
      {
        name: 'websocket',
        function: () => this.testWebSocketConnectivity(),
        description: 'Real-time WebSocket connectivity'
      }
    ];

    const results = [];

    for (const test of tests) {
      const result = await this.runTest(test.name, test.function, test.description);
      results.push({ name: test.name, ...result });
    }

    this.isRunning = false;

    const summary = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1),
      results: Object.fromEntries(this.testResults)
    };

    return summary;
  }

  /**
   * Get current test results
   */
  getResults() {
    return Object.fromEntries(this.testResults);
  }

  /**
   * Check if tests are currently running
   */
  isTestsRunning() {
    return this.isRunning;
  }

  /**
   * Reset test results
   */
  reset() {
    this.testResults.clear();
    this.isRunning = false;
  }
}

// Create singleton instance
export const connectivityService = new ConnectivityService();

// Export individual test functions for component use
export const connectivityTests = {
  testBackend: () => connectivityService.testBackendConnectivity(),
  testDatabase: () => connectivityService.testDatabaseConnectivity(),
  testAuth: () => connectivityService.testAuthEndpoints(),
  testCORS: () => connectivityService.testCORSConfiguration(),
  testAdmin: () => connectivityService.testAdminEndpoints(),
  testRestaurants: () => connectivityService.testRestaurantEndpoints(),
  testWebSocket: () => connectivityService.testWebSocketConnectivity(),
  runAll: () => connectivityService.runAllTests()
};

export default connectivityService;
