import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLock,
  FaEnvelope,
  FaCheck,
  FaTimes,
  FaClock,
  FaRedo,
  FaShieldAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaArrowLeft
} from 'react-icons/fa';
import ApiService from '../../shared/api/ApiService';
import simpleTokenService from '../../shared/auth/SimpleTokenService';
import { safeToastSuccess, safeToastError } from '../../shared/utils/toastUtils';
import { logger } from '../../shared/logging/logger';
const EmailOTPVerification = ({
  isOpen,
  onClose,
  onVerified,
  onCancel,
  email,
  purpose = 'profile_update',
  entityId,
  title = 'Verify Your Email',
  description = 'For security, please verify your email address to continue with profile updates.'
}) => {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Success
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


  // Timer for OTP expiry
  useEffect(() => {
    let timer;
    if (timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setError('OTP has expired. Please request a new one.');
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOtpCode('');
      setLoading(false);
      setError('');
      setSuccess('');
      setTimeRemaining(0);
      setCanResend(true);
    }
  }, [isOpen]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    if (!email?.trim()) {
      setError('Email address is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      logger.info('Sending email OTP', { email, purpose });

      // Call backend API to send email OTP
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
        throw new Error(result.message || 'Failed to send OTP');
      }

      if (result.success) {
        setTimeRemaining(600); // 10 minutes
        setCanResend(false);
        setStep(2);
        setSuccess(`OTP sent to ${email}`);
        
        // Show toast message for OTP sent
        safeToastSuccess(`OTP sent to your email! Please check ${email} (including spam folder)`);
        
        // Show development OTP in development mode
        if (result.data?.developmentOTP) {
          logger.info('Development OTP:', result.data.developmentOTP);
          safeToastSuccess(`Development OTP: ${result.data.developmentOTP}`);
        }
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      logger.error('Error sending email OTP:', error);
      setError(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  
  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setError('Please enter the OTP');
      return;
    }

    if (otpCode.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      logger.info('Verifying email OTP', { email, purpose });

      const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
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
          otp: otpCode,
          purpose: purpose
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify OTP');
      }

      if (result.success) {
        setStep(3);
        setSuccess('Email verified successfully');
        logger.info('Email OTP verified successfully');
        
        // Call the onVerified callback after a short delay
        setTimeout(() => {
          onVerified(result);
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (error) {
      logger.error('Error verifying email OTP:', error);
      setError(error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) {
      setError('Please wait before requesting another OTP.');
      return;
    }

    setLoading(true);
    setError('');
    setOtpCode('');

    try {
      // Call the same send OTP function
      await handleSendOTP();
      setSuccess('OTP resent successfully');
      safeToastSuccess(`OTP resent to ${email}! Please check your email (including spam folder)`);
    } catch (error) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-theme-bg-primary mt-10 rounded-2xl  sm:p-4 lg:p-4 w-full max-w-md mx-2 relative shadow-2xl border border-theme-border-primary"
      >
        {/* Header with Back and Close Buttons */}
        <div className="flex justify-between items-center ">
          <button
            onClick={onCancel || onClose}
            className="text-theme-text-secondary hover:text-theme-text-primary  rounded-lg hover:bg-theme-bg-hover transition-colors flex items-center justify-center"
            title="Back"
          >
            <FaArrowLeft className="text-lg" />
          </button>
          <button
            onClick={onClose}
            className="text-theme-text-secondary hover:text-theme-text-primary  rounded-lg hover:bg-theme-bg-hover transition-colors"
            title="Close"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="text-center">
          

          <h2 className="text-xl font-fredoka text-theme-text-primary mb-2">
            {title}
          </h2>

          <p className="text-theme-text-secondary font-raleway mb-6 text-sm">
            {description}
          </p>

          {/* Error/Success Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-status-error/10 border border-status-error/20 rounded-lg"
              >
                <div className="flex items-center space-x-2 text-status-error">
                  <FaExclamationTriangle />
                  <span className="font-raleway text-sm">{error}</span>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                key="success-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-status-success/10 border border-status-success/20 rounded-lg"
              >
                <div className="flex items-center space-x-2 text-status-success">
                  <FaCheck />
                  <span className="font-raleway text-sm">{success}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 1: Send OTP */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                  <FaEnvelope className="inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full input-theme rounded-lg px-4 py-3 font-raleway bg-theme-bg-secondary"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="flex-1 btn-primary py-3 sm:py-4 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <>
                      <FaLock />
                      <span>Send OTP</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onCancel || onClose}
                  className="btn-secondary px-4 py-3 sm:py-4 rounded-lg font-raleway flex items-center justify-center"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                  <FaLock className="inline mr-2" />
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full input-theme rounded-lg px-4 py-3 sm:py-4 font-raleway text-center text-xl sm:text-2xl tracking-widest focus:outline-none"
                  maxLength="6"
                  autoFocus
                />
              </div>

              {timeRemaining > 0 && (
                <div className="flex items-center justify-center space-x-2 text-theme-text-secondary">
                  <FaClock />
                  <span className="font-raleway text-sm">
                    OTP expires in {formatTime(timeRemaining)}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otpCode.length !== 6}
                  className="flex-1 btn-primary py-3 sm:py-4 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <>
                      <FaCheck />
                      <span>Verify OTP</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleResendOTP}
                  disabled={!canResend || loading || timeRemaining > 540} // Can resend after 1 minute
                  className="btn-secondary px-4 py-3 sm:py-4 rounded-lg font-raleway flex items-center justify-center disabled:opacity-50"
                  title="Resend OTP"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : <FaRedo />}
                </button>
              </div>

              <div className="text-sm text-theme-text-secondary font-raleway">
                Didn't receive the email? Check your spam folder or click resend.
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto">
                <FaCheck className="text-2xl text-status-success" />
              </div>
              <p className="text-theme-text-primary font-raleway">
                Email verification successful! You can now proceed with your profile updates.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EmailOTPVerification;