const { logger } = require('../utils/logger');
const orderCacheService = require('../services/orderCacheService');

/**
 * Security Monitoring Middleware
 * 
 * Monitors security events, suspicious activities, and maintains
 * security metrics for the multi-shop zone order system
 */
class SecurityMonitoringService {
  constructor() {
    this.securityEvents = new Map();
    this.suspiciousActivities = new Map();
    this.ipAttempts = new Map();
    this.userAttempts = new Map();
    
    this.thresholds = {
      maxFailedAttempts: 5,
      timeWindow: 15 * 60 * 1000, // 15 minutes
      maxOrdersPerUser: 10,
      maxRequestsPerIP: 100
    };

    this.alertHandlers = [];
  }

  /**
   * Record security event
   */
  recordSecurityEvent(eventType, req, additionalData = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.originalUrl,
      method: req.method,
      ...additionalData
    };

    const key = `${eventType}_${Date.now()}`;
    this.securityEvents.set(key, event);

    // Log the event
    logger.info('Security event recorded', event);

    // Check for suspicious patterns
    this.checkSuspiciousActivity(event);

    // Cleanup old events
    this.cleanupOldEvents();
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAuth(req, reason) {
    const ip = req.ip;
    const userId = req.body?.phone || req.body?.email || 'unknown';

    // Track IP-based attempts
    const ipKey = `ip_${ip}`;
    const ipAttempts = this.ipAttempts.get(ipKey) || {
      count: 0,
      firstAttempt: Date.now(),
      lastAttempt: Date.now()
    };

    ipAttempts.count++;
    ipAttempts.lastAttempt = Date.now();
    this.ipAttempts.set(ipKey, ipAttempts);

    // Track user-based attempts
    const userKey = `user_${userId}`;
    const userAttempts = this.userAttempts.get(userKey) || {
      count: 0,
      firstAttempt: Date.now(),
      lastAttempt: Date.now()
    };

    userAttempts.count++;
    userAttempts.lastAttempt = Date.now();
    this.userAttempts.set(userKey, userAttempts);

    this.recordSecurityEvent('failed_authentication', req, {
      reason,
      userId,
      ipAttemptCount: ipAttempts.count,
      userAttemptCount: userAttempts.count
    });

    // Check if IP or user should be flagged
    if (ipAttempts.count >= this.thresholds.maxFailedAttempts ||
        userAttempts.count >= this.thresholds.maxFailedAttempts) {
      this.flagSuspiciousActivity(req, 'excessive_failed_attempts', {
        ipAttempts: ipAttempts.count,
        userAttempts: userAttempts.count
      });
    }
  }

  /**
   * Record unauthorized access attempt
   */
  recordUnauthorizedAccess(req, requiredRole, attemptedAction) {
    this.recordSecurityEvent('unauthorized_access', req, {
      requiredRole,
      attemptedAction,
      userRole: req.user?.role
    });

    // Flag potential privilege escalation attempts
    if (req.user && req.user.role) {
      this.flagSuspiciousActivity(req, 'privilege_escalation_attempt', {
        userRole: req.user.role,
        requiredRole,
        attemptedAction
      });
    }
  }

  /**
   * Record suspicious order activity
   */
  recordSuspiciousOrder(req, suspicionType, orderData) {
    this.recordSecurityEvent('suspicious_order', req, {
      suspicionType,
      orderAmount: orderData.total,
      itemCount: orderData.items?.length,
      shopCount: orderData.shopCount
    });

    // Check for order-based suspicious patterns
    if (suspicionType === 'excessive_order_frequency') {
      this.flagSuspiciousActivity(req, 'order_frequency_abuse', {
        recentOrderCount: orderData.recentOrderCount
      });
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  checkSuspiciousActivity(event) {
    const ip = event.ip;
    const userId = event.userId;

    // Check for rapid-fire requests
    const recentEvents = Array.from(this.securityEvents.values())
      .filter(e => 
        e.ip === ip && 
        Date.now() - new Date(e.timestamp).getTime() < 60000 // Last minute
      );

    if (recentEvents.length > 20) { // More than 20 requests per minute
      this.flagSuspiciousActivity({ ip, user: { id: userId } }, 'rapid_requests', {
        requestCount: recentEvents.length,
        timeWindow: '1 minute'
      });
    }

    // Check for unusual endpoint access patterns
    const endpointAccess = recentEvents.reduce((acc, e) => {
      acc[e.endpoint] = (acc[e.endpoint] || 0) + 1;
      return acc;
    }, {});

    const uniqueEndpoints = Object.keys(endpointAccess).length;
    if (uniqueEndpoints > 10) { // Accessing too many different endpoints rapidly
      this.flagSuspiciousActivity({ ip, user: { id: userId } }, 'endpoint_scanning', {
        uniqueEndpoints,
        endpointAccess
      });
    }
  }

  /**
   * Flag suspicious activity
   */
  flagSuspiciousActivity(req, activityType, details) {
    const activity = {
      timestamp: new Date().toISOString(),
      type: activityType,
      ip: req.ip,
      userId: req.user?.id,
      severity: this.calculateSeverity(activityType, details),
      details,
      status: 'flagged'
    };

    const key = `${activityType}_${req.ip}_${Date.now()}`;
    this.suspiciousActivities.set(key, activity);

    logger.warn('Suspicious activity flagged', activity);

    // Trigger alerts if severity is high
    if (activity.severity === 'high') {
      this.triggerSecurityAlert(activity);
    }
  }

  /**
   * Calculate severity of suspicious activity
   */
  calculateSeverity(activityType, details) {
    switch (activityType) {
      case 'excessive_failed_attempts':
        return details.ipAttempts > 10 || details.userAttempts > 10 ? 'high' : 'medium';
      case 'privilege_escalation_attempt':
        return 'high';
      case 'order_frequency_abuse':
        return details.recentOrderCount > 20 ? 'high' : 'medium';
      case 'rapid_requests':
        return details.requestCount > 50 ? 'high' : 'medium';
      case 'endpoint_scanning':
        return details.uniqueEndpoints > 20 ? 'high' : 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Trigger security alert
   */
  triggerSecurityAlert(activity) {
    // Send alert to all registered handlers
    this.alertHandlers.forEach(handler => {
      try {
        handler(activity);
      } catch (error) {
        logger.error('Security alert handler error', { error: error.message });
      }
    });

    // Log high-severity alert
    logger.error('HIGH SEVERITY SECURITY ALERT', activity);
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(handler) {
    this.alertHandlers.push(handler);
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip) {
    const ipAttempts = this.ipAttempts.get(`ip_${ip}`);
    if (!ipAttempts) return false;

    const timeSinceFirst = Date.now() - ipAttempts.firstAttempt;
    const timeSinceLast = Date.now() - ipAttempts.lastAttempt;

    // Block if too many attempts and within time window
    return ipAttempts.count >= this.thresholds.maxFailedAttempts &&
           timeSinceFirst < this.thresholds.timeWindow &&
           timeSinceLast < 300000; // 5 minutes cooling period
  }

  /**
   * Check if user is temporarily locked
   */
  isUserLocked(userId) {
    const userAttempts = this.userAttempts.get(`user_${userId}`);
    if (!userAttempts) return false;

    const timeSinceFirst = Date.now() - userAttempts.firstAttempt;
    const timeSinceLast = Date.now() - userAttempts.lastAttempt;

    return userAttempts.count >= this.thresholds.maxFailedAttempts &&
           timeSinceFirst < this.thresholds.timeWindow &&
           timeSinceLast < 600000; // 10 minutes cooling period
  }

  /**
   * Generate security report
   */
  getSecurityReport(timeRange = 'hour') {
    const now = Date.now();
    const timeRanges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const timeWindow = timeRanges[timeRange] || timeRanges.hour;
    const startTime = now - timeWindow;

    // Filter events within time range
    const recentEvents = Array.from(this.securityEvents.values())
      .filter(event => new Date(event.timestamp).getTime() >= startTime);

    const suspiciousActivities = Array.from(this.suspiciousActivities.values())
      .filter(activity => new Date(activity.timestamp).getTime() >= startTime);

    // Aggregate statistics
    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    const topIPs = recentEvents.reduce((acc, event) => {
      acc[event.ip] = (acc[event.ip] || 0) + 1;
      return acc;
    }, {});

    const activitiesBySeverity = suspiciousActivities.reduce((acc, activity) => {
      acc[activity.severity] = (acc[activity.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      timeRange,
      period: {
        start: new Date(startTime).toISOString(),
        end: new Date(now).toISOString()
      },
      summary: {
        totalEvents: recentEvents.length,
        totalSuspiciousActivities: suspiciousActivities.length,
        uniqueIPs: Object.keys(topIPs).length,
        blockedIPs: Array.from(this.ipAttempts.keys())
          .filter(key => this.isIPBlocked(key.replace('ip_', ''))).length
      },
      breakdown: {
        eventsByType,
        topIPs: Object.entries(topIPs)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .reduce((acc, [ip, count]) => ({ ...acc, [ip]: count }), {}),
        activitiesBySeverity
      },
      recentAlerts: suspiciousActivities
        .filter(activity => activity.severity === 'high')
        .slice(0, 10)
        .map(activity => ({
          type: activity.type,
          timestamp: activity.timestamp,
          ip: activity.ip,
          severity: activity.severity
        }))
    };
  }

  /**
   * Reset user attempts (for manual unlock)
   */
  resetUserAttempts(userId) {
    this.userAttempts.delete(`user_${userId}`);
    logger.info('User attempts reset', { userId });
  }

  /**
   * Reset IP attempts (for manual unblock)
   */
  resetIPAttempts(ip) {
    this.ipAttempts.delete(`ip_${ip}`);
    logger.info('IP attempts reset', { ip });
  }

  /**
   * Cleanup old events and attempts
   */
  cleanupOldEvents() {
    const cutoffTime = Date.now() - this.thresholds.timeWindow;

    // Cleanup old security events
    for (const [key, event] of this.securityEvents.entries()) {
      if (new Date(event.timestamp).getTime() < cutoffTime) {
        this.securityEvents.delete(key);
      }
    }

    // Cleanup old IP attempts
    for (const [key, attempts] of this.ipAttempts.entries()) {
      if (attempts.firstAttempt < cutoffTime) {
        this.ipAttempts.delete(key);
      }
    }

    // Cleanup old user attempts
    for (const [key, attempts] of this.userAttempts.entries()) {
      if (attempts.firstAttempt < cutoffTime) {
        this.userAttempts.delete(key);
      }
    }

    // Cleanup old suspicious activities
    for (const [key, activity] of this.suspiciousActivities.entries()) {
      if (new Date(activity.timestamp).getTime() < cutoffTime) {
        this.suspiciousActivities.delete(key);
      }
    }
  }

  /**
   * Security middleware for Express
   */
  middleware() {
    return (req, res, next) => {
      // Check if IP is blocked
      if (this.isIPBlocked(req.ip)) {
        this.recordSecurityEvent('blocked_ip_access', req);
        return res.status(429).json({
          success: false,
          error: 'Access temporarily blocked',
          message: 'Too many failed attempts. Please try again later.'
        });
      }

      // Check if user is locked (if authenticated)
      if (req.user && this.isUserLocked(req.user.id)) {
        this.recordSecurityEvent('locked_user_access', req);
        return res.status(423).json({
          success: false,
          error: 'Account temporarily locked',
          message: 'Too many failed attempts. Please wait before trying again.'
        });
      }

      // Add security context to request
      req.security = {
        recordEvent: (eventType, data) => this.recordSecurityEvent(eventType, req, data),
        recordFailedAuth: (reason) => this.recordFailedAuth(req, reason),
        recordUnauthorizedAccess: (role, action) => this.recordUnauthorizedAccess(req, role, action),
        recordSuspiciousOrder: (type, data) => this.recordSuspiciousOrder(req, type, data)
      };

      next();
    };
  }
}

module.exports = new SecurityMonitoringService();