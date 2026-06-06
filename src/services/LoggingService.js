import { logger as baseLogger } from '../shared/logging/logger';

// Compatibility wrapper for legacy imports.
// Many parts of the app still import `src/services/LoggingService` and use
// helper methods like `route()`. This module adapts those calls to the
// canonical shared logger implementation.

const loggingService = {
  debug: (message, meta = {}, component = null) => baseLogger.debug(message, meta, component),
  info: (message, meta = {}, component = null) => baseLogger.info(message, meta, component),
  warn: (message, meta = {}, component = null) => baseLogger.warn(message, meta, component),
  error: (message, error = null, component = null) => baseLogger.error(message, error, component),

  perf: (label, duration = null, meta = {}) => baseLogger.perf(label, duration, meta),
  perfStart: (label) => baseLogger.perfStart(label),
  perfEnd: (label, meta = {}) => baseLogger.perfEnd(label, meta),

  apiRequest: (method, url, duration, status, meta = {}) =>
    baseLogger.apiRequest(method, url, duration, status, meta),

  userAction: (action, component, meta = {}) => baseLogger.userAction(action, component, meta),
  navigation: (from, to, meta = {}) => baseLogger.navigation(from, to, meta),
  websocket: (event, data = {}) => baseLogger.websocket(event, data),

  // Legacy helper shims
  route: (message, url, meta = {}, component = 'Route') =>
    baseLogger.debug(message, { url, ...meta }, component),
  system: (message, meta = {}) => baseLogger.info(message, meta, 'System'),
  service: (serviceName, message, meta = {}) =>
    baseLogger.debug(message, { service: serviceName, ...meta }, 'Service'),

  createChildLogger: (component) => baseLogger.createChildLogger(component),
  getMetrics: () => baseLogger.getMetrics(),
  resetMetrics: () => baseLogger.resetMetrics(),
  getPerformanceEntries: () => baseLogger.getPerformanceEntries()
};

export default loggingService;

// Some newer code imports `{ logger }` from the shared path directly.
// Exporting it here too makes this module flexible for either pattern.
export { baseLogger as logger };
