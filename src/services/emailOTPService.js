const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');
const { generateOTP, verifyOTP } = require('./authService');

class EmailOTPService {
  constructor() {
    this.transporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter with configuration from environment variables
   */
  async initializeEmailTransporter() {
    try {
      // Check if environment variables are set
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction) {
          logger.error('CRITICAL: Email configuration missing in production. SMTP_USER and SMTP_PASS environment variables are required.');
          throw new Error('Email service configuration is required in production mode');
        } else {
          logger.warn('Email configuration missing. SMTP_USER and SMTP_PASS environment variables are required.');
          logger.warn('Current environment variables:', {
            SMTP_HOST: process.env.SMTP_HOST || 'not set',
            SMTP_PORT: process.env.SMTP_PORT || 'not set',
            SMTP_USER: process.env.SMTP_USER ? 'set' : 'not set',
            SMTP_PASS: process.env.SMTP_PASS ? 'set' : 'not set'
          });
          this.transporter = null;
          return;
        }
      }

      // Validate Gmail app password format
      if (process.env.SMTP_HOST === 'smtp.gmail.com' && process.env.SMTP_PASS) {
        const appPassword = process.env.SMTP_PASS.replace(/\s/g, ''); // Remove any spaces
        if (appPassword.length !== 16) {
          const errorMsg = 'Invalid Gmail app password format. Gmail app passwords must be exactly 16 characters without spaces.';
          logger.error(errorMsg);
          logger.warn('Please generate a new app password from your Google Account settings.');

          if (process.env.NODE_ENV === 'production') {
            throw new Error(errorMsg);
          } else {
            this.transporter = null;
            return;
          }
        }
        // Update the password to remove any spaces
        process.env.SMTP_PASS = appPassword;
      }

      // Enhanced SMTP configuration for production
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // Production-specific settings
        pool: process.env.NODE_ENV === 'production', // Use connection pooling in production
        maxConnections: process.env.NODE_ENV === 'production' ? 5 : 1,
        maxMessages: process.env.NODE_ENV === 'production' ? 100 : 1,
        rateDelta: 1000, // 1 second between messages
        rateLimit: process.env.NODE_ENV === 'production' ? 5 : false, // 5 messages per second max
        // Connection timeout settings
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,   // 30 seconds
        socketTimeout: 60000      // 60 seconds
      };

      logger.info('Initializing email service with configuration:', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: smtpConfig.auth.user,
        secure: smtpConfig.secure,
        pool: smtpConfig.pool,
        environment: process.env.NODE_ENV
      });

      // Create transporter
      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection configuration
      await this.transporter.verify();
      logger.info('✅ Email service initialized successfully - emails will be sent');

      // Initialize email rate limiting
      this.initializeRateLimiting();

    } catch (error) {
      // Enhanced error handling for Gmail-specific issues
      const errorMessage = this.getGmailErrorMessage(error);

      logger.error('Failed to initialize email service:', {
        message: error.message,
        code: error.code,
        command: error.command,
        enhancedMessage: errorMessage,
        environment: process.env.NODE_ENV
      });

      // Log specific troubleshooting steps
      logger.warn('Email service troubleshooting steps:');
      logger.warn('1. Ensure 2-factor authentication is enabled on your Gmail account');
      logger.warn('2. Generate an app password from Google Account settings');
      logger.warn('3. Use the 16-character app password (no spaces) in SMTP_PASS');
      logger.warn('4. Verify SMTP_USER contains the correct Gmail address');

      // In production, fail fast - don't continue without email service
      if (process.env.NODE_ENV === 'production') {
        logger.error('CRITICAL: Email service failed to initialize in production mode');
        throw error;
      } else {
        // Continue without email service for development
        this.transporter = null;
        logger.warn('Falling back to development mode - OTPs will be shown in console');
      }
    }
  }

  /**
   * Initialize email rate limiting
   */
  initializeRateLimiting() {
    this.emailRateLimit = new Map();
    this.rateLimitWindow = parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW_MS) || 3600000; // 1 hour
    this.rateLimitMax = parseInt(process.env.EMAIL_RATE_LIMIT_MAX_EMAILS) || 10; // 10 emails per hour

    // Clean up old rate limit entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.emailRateLimit.entries()) {
        if (now - data.firstRequest > this.rateLimitWindow) {
          this.emailRateLimit.delete(key);
        }
      }
    }, this.rateLimitWindow);

    logger.info('Email rate limiting initialized:', {
      window: this.rateLimitWindow / 1000 / 60, // minutes
      maxEmails: this.rateLimitMax
    });
  }

  /**
   * Check email rate limit for a user
   * @param {string} email - User email
   * @returns {Object} - Rate limit check result
   */
  checkEmailRateLimit(email) {
    if (!this.emailRateLimit) {
      return { allowed: true };
    }

    const now = Date.now();
    const key = email.toLowerCase();

    if (!this.emailRateLimit.has(key)) {
      this.emailRateLimit.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now
      });
      return { allowed: true };
    }

    const userData = this.emailRateLimit.get(key);

    // Reset if window has passed
    if (now - userData.firstRequest > this.rateLimitWindow) {
      userData.count = 1;
      userData.firstRequest = now;
      userData.lastRequest = now;
      return { allowed: true };
    }

    // Check if limit exceeded
    if (userData.count >= this.rateLimitMax) {
      const timeRemaining = this.rateLimitWindow - (now - userData.firstRequest);
      return {
        allowed: false,
        timeRemaining: Math.ceil(timeRemaining / 1000 / 60), // minutes
        maxEmails: this.rateLimitMax
      };
    }

    // Increment count
    userData.count++;
    userData.lastRequest = now;

    return { allowed: true };
  }

  /**
   * Get user-friendly error message for Gmail authentication issues
   * @param {Error} error - The error object from nodemailer
   * @returns {string} - User-friendly error message
   */
  getGmailErrorMessage(error) {
    const errorCode = error.code;
    const errorMessage = error.message || '';

    if (errorMessage.includes('535-5.7.8') || errorMessage.includes('Username and Password not accepted')) {
      return 'Gmail authentication failed. Please ensure you are using an app password (not your regular Gmail password) and that 2-factor authentication is enabled.';
    }

    if (errorMessage.includes('534-5.7.9') || errorMessage.includes('Application-specific password required')) {
      return 'Gmail requires an app password. Please generate one from your Google Account settings and use it instead of your regular password.';
    }

    if (errorMessage.includes('534-5.7.14')) {
      return 'Gmail account access blocked. Please check your Google Account security settings and ensure less secure app access is configured properly.';
    }

    if (errorCode === 'ECONNREFUSED' || errorCode === 'ETIMEDOUT') {
      return 'Cannot connect to Gmail SMTP server. Please check your internet connection and firewall settings.';
    }

    if (errorCode === 'EAUTH') {
      return 'Gmail authentication failed. Please verify your email address and app password are correct.';
    }

    return `Gmail connection error: ${errorMessage}`;
  }

  /**
   * Generate OTP for email verification
   * @returns {Object} - OTP data
   */
  generateEmailOTP() {
    return generateOTP(); // Reuse existing OTP generation logic
  }

  /**
   * Send OTP via email
   * @param {string} email - Recipient email address
   * @param {string} otp - OTP code to send
   * @param {string} purpose - Purpose of the OTP (e.g., 'profile_update', 'verification')
   * @returns {Promise<Object>} - Send result
   */
  async sendEmailOTP(email, otp, purpose = 'verification') {
    try {
      // Check email rate limit
      const rateLimitCheck = this.checkEmailRateLimit(email);
      if (!rateLimitCheck.allowed) {
        logger.warn('Email rate limit exceeded', {
          email: email,
          timeRemaining: rateLimitCheck.timeRemaining,
          maxEmails: rateLimitCheck.maxEmails
        });

        return {
          success: false,
          message: `Too many emails sent. Please try again in ${rateLimitCheck.timeRemaining} minutes.`,
          code: 'EMAIL_RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitCheck.timeRemaining * 60 // seconds
        };
      }

      // Generate email content based on purpose
      const emailContent = this.generateEmailContent(otp, purpose);

      // If transporter is not available (development mode), log the OTP
      if (!this.transporter) {
        logger.info(`📧 Email OTP (Development Mode):`, {
          to: email,
          otp: otp,
          purpose: purpose
        });

        // For development, show OTP in console
        console.log(`\n🔐 EMAIL OTP FOR ${email}: ${otp}\n`);

        return {
          success: true,
          message: 'OTP sent successfully (development mode)',
          developmentOTP: otp // Include for development
        };
      }

      // Enhanced mail options for production
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'tableserve@example.com',
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        // Production email headers
        headers: {
          'X-Mailer': 'TableServe',
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        },
        // Email tracking (optional)
        messageId: `tableserve-${Date.now()}-${Math.random().toString(36).substring(2, 11)}@tableserve.com`
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email OTP sent successfully', {
        to: email,
        messageId: result.messageId,
        purpose: purpose,
        environment: process.env.NODE_ENV
      });

      return {
        success: true,
        message: 'OTP sent to your email address',
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Failed to send email OTP:', {
        error: error.message,
        email: email,
        purpose: purpose,
        code: error.code,
        command: error.command
      });

      // Return user-friendly error message
      const isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
      const isAuthError = error.code === 'EAUTH' || error.message.includes('authentication');

      let userMessage = 'Failed to send OTP email. Please try again.';
      if (isNetworkError) {
        userMessage = 'Email service temporarily unavailable. Please try again in a few minutes.';
      } else if (isAuthError && process.env.NODE_ENV !== 'production') {
        userMessage = 'Email configuration error. Please check your email settings.';
      }

      return {
        success: false,
        message: userMessage,
        code: 'EMAIL_SEND_FAILED'
      };
    }
  }

  /**
   * Generate email content for different purposes
   * @param {string} otp - OTP code
   * @param {string} purpose - Purpose of the OTP
   * @returns {Object} - Email content
   */
  generateEmailContent(otp, purpose) {
    const templates = {
      profile_update: {
        subject: 'TableServe - Profile Update Verification',
        title: 'Verify Your Profile Update',
        message: 'You are updating your profile information. Please use the following OTP to confirm this action:'
      },
      verification: {
        subject: 'TableServe - Email Verification',
        title: 'Verify Your Email',
        message: 'Please use the following OTP to verify your email address:'
      },
      security: {
        subject: 'TableServe - Security Verification',
        title: 'Security Verification Required',
        message: 'For security purposes, please verify your identity with the following OTP:'
      }
    };

    const template = templates[purpose] || templates.verification;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box { background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; margin: 10px 0; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍽️ TableServe</h1>
            <h2>${template.title}</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>${template.message}</p>
            
            <div class="otp-box">
              <p><strong>Your OTP Code:</strong></p>
              <div class="otp-code">${otp}</div>
              <p><small>Valid for 10 minutes</small></p>
            </div>

            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong></p>
              <ul>
                <li>This OTP is valid for 10 minutes only</li>
                <li>Never share this code with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>

            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <div class="footer">
              <p>© 2024 TableServe. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${template.title}
      
      ${template.message}
      
      Your OTP Code: ${otp}
      
      This code is valid for 10 minutes only.
      Never share this code with anyone.
      If you didn't request this, please ignore this email.
      
      © 2024 TableServe. All rights reserved.
    `;

    return {
      subject: template.subject,
      html: html,
      text: text
    };
  }

  /**
   * Verify email OTP
   * @param {string} providedOTP - OTP provided by user
   * @param {string} storedHashedOTP - Stored hashed OTP
   * @param {Date} expiresAt - OTP expiration date
   * @returns {Object} - Verification result
   */
  verifyEmailOTP(providedOTP, storedHashedOTP, expiresAt) {
    return {
      isValid: verifyOTP(providedOTP, storedHashedOTP, expiresAt),
      message: verifyOTP(providedOTP, storedHashedOTP, expiresAt) 
        ? 'OTP verified successfully' 
        : 'Invalid or expired OTP'
    };
  }

  /**
   * Validate email configuration
   * @returns {Object} - Validation result
   */
  validateEmailConfiguration() {
    const issues = [];
    const warnings = [];

    // Check required environment variables
    if (!process.env.SMTP_USER) {
      issues.push('SMTP_USER environment variable is not set');
    } else if (!process.env.SMTP_USER.includes('@')) {
      issues.push('SMTP_USER must be a valid email address');
    }

    if (!process.env.SMTP_PASS) {
      issues.push('SMTP_PASS environment variable is not set');
    } else {
      // Validate Gmail app password format
      if (process.env.SMTP_HOST === 'smtp.gmail.com') {
        const password = process.env.SMTP_PASS.replace(/\s/g, '');
        if (password.length !== 16) {
          issues.push('Gmail app password must be exactly 16 characters without spaces');
        }
        if (process.env.SMTP_PASS.includes(' ')) {
          warnings.push('Gmail app password contains spaces - they will be automatically removed');
        }
      }
    }

    // Check SMTP configuration
    const port = parseInt(process.env.SMTP_PORT);
    if (isNaN(port) || port <= 0 || port > 65535) {
      warnings.push('Invalid SMTP_PORT - using default 587');
    }

    if (!process.env.SMTP_HOST) {
      warnings.push('SMTP_HOST not set - using default smtp.gmail.com');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      summary: issues.length === 0 ? 'Email configuration is valid' : `Found ${issues.length} issue(s)`
    };
  }

  /**
   * Test email configuration
   * @returns {Promise<Object>} - Test result
   */
  async testEmailConfiguration() {
    try {
      // First validate configuration
      const validation = this.validateEmailConfiguration();
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Email configuration validation failed',
          issues: validation.issues,
          warnings: validation.warnings
        };
      }

      if (!this.transporter) {
        // Try to reinitialize if transporter is null
        await this.initializeEmailTransporter();

        if (!this.transporter) {
          return {
            success: false,
            message: 'Email transporter could not be initialized. Check your email configuration.',
            issues: validation.issues,
            warnings: validation.warnings
          };
        }
      }

      // Test connection
      await this.transporter.verify();

      return {
        success: true,
        message: 'Email configuration is working correctly',
        warnings: validation.warnings
      };
    } catch (error) {
      const errorMessage = this.getGmailErrorMessage(error);
      logger.error('Email configuration test failed:', error);

      return {
        success: false,
        message: 'Email configuration test failed',
        error: error.message,
        enhancedError: errorMessage,
        troubleshooting: [
          'Ensure 2-factor authentication is enabled on your Gmail account',
          'Generate an app password from Google Account settings',
          'Use the 16-character app password (no spaces) in SMTP_PASS',
          'Verify SMTP_USER contains the correct Gmail address'
        ]
      };
    }
  }
}

// Export singleton instance
module.exports = new EmailOTPService();