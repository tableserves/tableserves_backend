import LocalStorageService from '../shared/storage/LocalStorageService';
import simpleTokenService from '../shared/auth/SimpleTokenService';
import { logger } from '../shared/logging/logger';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class OTPService {
  // Generate and send OTP (simulated)
  static async sendOTP(phoneNumber, purpose, entityId) {
    try {
      // Clean up expired sessions first
      LocalStorageService.cleanupExpiredOTPSessions();
      
      // Generate OTP
      const otp = LocalStorageService.generateOTP();
      
      // Create OTP session
      const session = LocalStorageService.createOTPSession(phoneNumber, otp, purpose, entityId);
      
      // Simulate SMS sending (in real app, integrate with SMS service)
      console.log(`📱 SMS Sent to ${phoneNumber}: Your TableServe OTP is ${otp}. Valid for 10 minutes.`);
      
      // For demo purposes, show OTP in alert (remove in production)
      alert(`Demo OTP sent to ${phoneNumber}: ${otp}\n\nIn production, this would be sent via SMS.`);
      
      return {
        success: true,
        sessionId: session.id,
        message: 'OTP sent successfully',
        // Remove this in production
        demoOTP: otp
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  }


  // Send Email OTP (new method)
  static async sendEmailOTP(email, purpose = 'verification') {
    try {
      logger.info('Sending email OTP via API', { email, purpose });

      const response = await fetch(`${API_BASE_URL}/auth/send-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include authorization header for profile updates
          ...(purpose === 'profile_update' && {
            'Authorization': `Bearer ${simpleTokenService.getAccessToken()}`
          })
        },
        body: JSON.stringify({
          email: email,
          purpose: purpose
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email OTP');
      }

      return {
        success: result.success,
        message: result.message,
        sessionId: `email_${Date.now()}`, // Create a session ID for consistency
        developmentOTP: result.data?.developmentOTP // For development
      };
    } catch (error) {
      logger.error('Error sending email OTP:', error);
      return {
        success: false,
        message: error.message || 'Failed to send email OTP'
      };
    }
  }

  // Verify Email OTP (new method)
  static async verifyEmailOTP(email, otp, purpose = 'verification') {
    try {
      logger.info('Verifying email OTP via API', { email, purpose });

      const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
          purpose: purpose
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify email OTP');
      }

      return {
        success: result.success,
        message: result.message,
        verified: result.data?.verified || false
      };
    } catch (error) {
      logger.error('Error verifying email OTP:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify email OTP'
      };
    }
  }

  // Verify OTP
  static verifyOTP(sessionId, enteredOTP) {
    return LocalStorageService.verifyOTP(sessionId, enteredOTP);
  }

  // Resend OTP
  static async resendOTP(sessionId) {
    try {
      const sessions = LocalStorageService.getOTPSessions();
      const session = sessions[sessionId];
      
      if (!session) {
        return {
          success: false,
          message: 'Invalid session'
        };
      }

      // Generate new OTP
      const newOTP = LocalStorageService.generateOTP();
      
      // Update session with new OTP and extended expiry
      session.otp = newOTP;
      session.createdAt = new Date().toISOString();
      session.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      session.verified = false;
      
      sessions[sessionId] = session;
      LocalStorageService.saveOTPSessions(sessions);
      
      // Simulate SMS sending
      console.log(`📱 SMS Resent to ${session.phoneNumber}: Your TableServe OTP is ${newOTP}. Valid for 10 minutes.`);
      
      // For demo purposes
      alert(`Demo OTP resent to ${session.phoneNumber}: ${newOTP}\n\nIn production, this would be sent via SMS.`);
      
      return {
        success: true,
        message: 'OTP resent successfully',
        // Remove this in production
        demoOTP: newOTP
      };
    } catch (error) {
      console.error('Error resending OTP:', error);
      return {
        success: false,
        message: 'Failed to resend OTP'
      };
    }
  }

  // Format phone number for display
  static formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Format based on length
    if (digits.length === 10) {
      // US format: (123) 456-7890
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US format with country code: +1 (123) 456-7890
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 12 && digits.startsWith('91')) {
      // Indian format: +91 79040 21564
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    } else {
      // Default format
      return phoneNumber;
    }
  }

  // Validate phone number
  static validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Accept 10-digit US numbers, 11-digit with country code, or 12-digit Indian numbers
    return digits.length >= 10 && digits.length <= 12;
  }

  // Get remaining time for OTP session
  static getSessionTimeRemaining(sessionId) {
    try {
      const sessions = LocalStorageService.getOTPSessions();
      const session = sessions[sessionId];
      
      if (!session) return 0;
      
      const expiryTime = new Date(session.expiresAt);
      const currentTime = new Date();
      const remainingMs = expiryTime - currentTime;
      
      return Math.max(0, Math.ceil(remainingMs / 1000)); // Return seconds
    } catch (error) {
      console.error('Error getting session time:', error);
      return 0;
    }
  }

  // Format time remaining as MM:SS
  static formatTimeRemaining(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Clean up expired sessions
  static cleanupExpiredSessions() {
    LocalStorageService.cleanupExpiredOTPSessions();
  }

  // Get session info (for debugging)
  static getSessionInfo(sessionId) {
    const sessions = LocalStorageService.getOTPSessions();
    return sessions[sessionId] || null;
  }

  // Cancel OTP session
  static cancelSession(sessionId) {
    try {
      const sessions = LocalStorageService.getOTPSessions();
      if (sessions[sessionId]) {
        delete sessions[sessionId];
        LocalStorageService.saveOTPSessions(sessions);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error canceling session:', error);
      return false;
    }
  }

  // Check if phone number has active session
  static hasActiveSession(phoneNumber) {
    try {
      const sessions = LocalStorageService.getOTPSessions();
      const now = new Date();
      
      return Object.values(sessions).some(session => 
        session.phoneNumber === phoneNumber && 
        new Date(session.expiresAt) > now &&
        !session.verified
      );
    } catch (error) {
      console.error('Error checking active session:', error);
      return false;
    }
  }

  // Get active session for phone number
  static getActiveSession(phoneNumber) {
    try {
      const sessions = LocalStorageService.getOTPSessions();
      const now = new Date();
      
      return Object.values(sessions).find(session => 
        session.phoneNumber === phoneNumber && 
        new Date(session.expiresAt) > now &&
        !session.verified
      ) || null;
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }
}

export default OTPService;
