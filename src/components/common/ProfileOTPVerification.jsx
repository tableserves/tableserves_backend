import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLock,
  FaPhone,
  FaCheck,
  FaTimes,
  FaClock,
  FaRedo,
  FaShieldAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import OTPService from '../../services/OTPService';

const ProfileOTPVerification = ({
  isOpen,
  onClose,
  onVerified,
  onCancel,
  phoneNumber,
  purpose = 'profile_update',
  entityId,
  title = 'Verify Your Identity',
  description = 'For security, please verify your phone number to continue with profile updates.'
}) => {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Success
  const [otpCode, setOtpCode] = useState('');
  const [otpSession, setOtpSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Timer for OTP expiry
  useEffect(() => {
    let timer;
    if (timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setError('OTP has expired. Please request a new one.');
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
      setOtpSession(null);
      setLoading(false);
      setError('');
      setSuccess('');
      setTimeRemaining(0);
    }
  }, [isOpen]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    if (!phoneNumber?.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await OTPService.sendOTP(
        phoneNumber,
        purpose,
        entityId
      );

      if (result.success) {
        setOtpSession({ id: result.sessionId });
        setTimeRemaining(600); // 10 minutes
        setStep(2);
        setSuccess(`OTP sent to ${phoneNumber}`);
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
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
      const result = OTPService.verifyOTP(otpSession.id, otpCode);

      if (result.success) {
        setStep(3);
        setSuccess('Phone number verified successfully');
        // Call the onVerified callback after a short delay
        setTimeout(() => {
          onVerified(result);
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!otpSession?.id) return;

    setLoading(true);
    setError('');

    try {
      const result = await OTPService.resendOTP(otpSession.id);

      if (result.success) {
        setTimeRemaining(600);
        setSuccess('OTP resent successfully');
        setOtpCode('');
      } else {
        setError(result.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-theme-bg-primary rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-md mx-4 relative shadow-2xl border border-theme-border-primary"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
        >
          <FaTimes className="text-xl" />
        </button>

        <div className="text-center">
          {/* Header */}
          <div className="w-16 h-16 bg-theme-accent-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaShieldAlt className="text-2xl text-theme-accent-primary" />
          </div>

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
                  <FaPhone className="inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  readOnly
                  className="w-full input-theme rounded-lg px-4 py-3 font-raleway bg-theme-bg-secondary"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="flex-1 btn-primary py-3 sm:py-4 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FaCheck />
                      <span>Verify OTP</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleResendOTP}
                  disabled={timeRemaining > 2000} // Can resend after 1 minute
                  className="btn-secondary px-4 py-3 sm:py-4 rounded-lg font-raleway flex items-center justify-center disabled:opacity-50"
                  title="Resend OTP"
                >
                  <FaRedo />
                </button>
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
                Verification successful! You can now proceed with your profile updates.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileOTPVerification;
