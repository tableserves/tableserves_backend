import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaKey,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaClock,
  FaCheck,
  FaExclamationTriangle,
  FaRedo
} from 'react-icons/fa';
import OTPService from '../../services/OTPService';

const PasswordManagementModal = ({
  isOpen,
  onClose,
  entity, // restaurant or zone object
  entityType, // 'restaurant' or 'zone'
  onPasswordUpdate,
  currentUserRole // 'superadmin', 'restaurant_owner', 'zone_admin'
}) => {
  const [step, setStep] = useState(1); // 1: Phone verification, 2: OTP verification, 3: New password
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSession, setOtpSession] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Initialize phone number based on entity and user role
  useEffect(() => {
    if (isOpen && entity) {
      if (currentUserRole === 'superadmin') {
        // Super admin changes password - use entity owner's phone
        setPhoneNumber(entity.ownerPhone || '');
      } else {
        // Owner changes their own password - use their phone
        setPhoneNumber(entity.ownerPhone || '');
      }
    }
  }, [isOpen, entity, currentUserRole]);

  // Timer for OTP expiry
  useEffect(() => {
    let interval;
    if (otpSession && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setOtpSession(null);
            setError('OTP expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSession, timeRemaining]);

  const resetModal = () => {
    setStep(1);
    setPhoneNumber('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLoading(false);
    setError('');
    setSuccess('');
    setOtpSession(null);
    setTimeRemaining(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!OTPService.validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await OTPService.sendOTP(
        phoneNumber,
        'password_reset',
        entity.id
      );

      if (result.success) {
        setOtpSession({ id: result.sessionId });
        setTimeRemaining(600); // 10 minutes
        setStep(2);
        setSuccess(`OTP sent to ${OTPService.formatPhoneNumber(phoneNumber)}`);
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

    if (!otpSession) {
      setError('No active OTP session. Please request a new OTP.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = OTPService.verifyOTP(otpSession.id, otpCode);

      if (result.success) {
        setStep(3);
        setSuccess('Phone number verified successfully');
        setError(''); // Clear any previous errors
      } else {
        setError(result.message || 'Invalid OTP');
        setSuccess(''); // Clear any previous success messages
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!otpSession) return;

    setLoading(true);
    setError('');

    try {
      const result = await OTPService.resendOTP(otpSession.id);

      if (result.success) {
        setTimeRemaining(600); // Reset timer
        setSuccess('New OTP sent successfully');
        setOtpCode(''); // Clear previous OTP
      } else {
        setError(result.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      setError('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call the parent component's password update function
      await onPasswordUpdate(entity.id, newPassword);
      setSuccess('Password updated successfully!');

      // Close modal after a short delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Verify Phone Number';
      case 2: return 'Enter OTP Code';
      case 3: return 'Set New Password';
      default: return 'Password Management';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return `We'll send an OTP to verify your identity before changing the password for ${entity?.name || 'this account'}.`;
      case 2: return `Enter the 6-digit OTP sent to ${OTPService.formatPhoneNumber(phoneNumber)}`;
      case 3: return 'Create a new secure password for the account.';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="admin-card rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-theme-accent-primary rounded-lg flex items-center justify-center">
                <FaKey className="text-theme-text-inverse" />
              </div>
              <div>
                <h2 className="text-xl font-fredoka text-theme-text-primary">{getStepTitle()}</h2>
                <p className="text-theme-text-secondary font-raleway text-sm">
                  {entityType === 'restaurant' ? 'Restaurant' : 'Zone'}: {entity?.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-theme-text-tertiary hover:text-theme-text-primary transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-6">
            {[1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-raleway font-semibold ${step >= stepNumber
                    ? 'bg-theme-accent-primary text-theme-text-inverse'
                    : 'bg-theme-bg-secondary text-theme-text-tertiary'
                  }`}>
                  {step > stepNumber ? <FaCheck /> : stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-8 h-0.5 ${step > stepNumber ? 'bg-theme-accent-primary' : 'bg-theme-bg-secondary'
                    }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Description */}
          <p className="text-theme-text-secondary font-raleway text-sm text-center mb-6">
            {getStepDescription()}
          </p>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center space-x-2">
              <FaExclamationTriangle className="text-red-500" />
              <span className="text-red-500 font-raleway text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4 flex items-center space-x-2">
              <FaCheck className="text-green-500" />
              <span className="text-green-500 font-raleway text-sm">{success}</span>
            </div>
          )}

          {/* Step Content */}
          <div className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                    <FaPhone className="inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full input-theme rounded-lg px-4 py-3 font-raleway focus:outline-none"
                    disabled={currentUserRole === 'superadmin'} // Super admin can't change the phone
                  />
                  {currentUserRole === 'superadmin' && (
                    <p className="text-theme-text-tertiary font-raleway text-xs mt-1">
                      OTP will be sent to the {entityType} owner's registered phone number
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full btn-primary py-3 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FaPhone />
                      <span>Send OTP</span>
                    </>
                  )}
                </button>
              </>
            )}

            {step === 2 && (
              <>
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
                    className="w-full input-theme rounded-lg px-4 py-3 font-raleway text-center text-2xl tracking-widest focus:outline-none"
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

                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <button
                      onClick={handleVerifyOTP}
                      disabled={loading || otpCode.length !== 6}
                      className="flex-1 btn-primary py-3 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
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
                      disabled={loading || timeRemaining > 598} // Can resend after 2 seconds (600-2=598)
                      className={`px-4 py-3 rounded-lg font-raleway flex items-center justify-center transition-all duration-200 ${
                        loading || timeRemaining > 598
                          ? 'bg-theme-bg-tertiary text-theme-text-tertiary cursor-not-allowed'
                          : 'btn-secondary hover:bg-theme-accent-primary hover:text-white'
                      }`}
                      title={timeRemaining > 598 ? `Wait ${600 - timeRemaining} more seconds` : "Resend OTP"}
                    >
                      <FaRedo className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {timeRemaining > 598 && (
                    <div className="text-center">
                      <span className="text-theme-text-tertiary text-xs font-raleway">
                        Resend available in {600 - timeRemaining} seconds
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                    <FaLock className="inline mr-2" />
                    New Password
                  </label>
                  <div className="password-input-container relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full input-theme rounded-lg px-4 py-3 pr-12 font-raleway focus:outline-none"
                      minLength="6"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle-btn text-theme-text-tertiary hover:text-theme-text-primary"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                    <FaLock className="inline mr-2" />
                    Confirm Password
                  </label>
                  <div className="password-input-container relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full input-theme rounded-lg px-4 py-3 pr-12 font-raleway focus:outline-none"
                      minLength="6"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="password-toggle-btn text-theme-text-tertiary hover:text-theme-text-primary"
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-theme-bg-secondary rounded-lg p-3">
                  <p className="text-theme-text-primary font-raleway font-medium text-sm mb-2">Password Requirements:</p>
                  <ul className="text-theme-text-secondary font-raleway text-xs space-y-1">
                    <li className={`flex items-center space-x-2 ${newPassword.length >= 6 ? 'text-green-500' : ''}`}>
                      <span>{newPassword.length >= 6 ? '✓' : '•'}</span>
                      <span>At least 6 characters long</span>
                    </li>
                    <li className={`flex items-center space-x-2 ${newPassword === confirmPassword && newPassword.length > 0 ? 'text-green-500' : ''}`}>
                      <span>{newPassword === confirmPassword && newPassword.length > 0 ? '✓' : '•'}</span>
                      <span>Passwords match</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleUpdatePassword}
                  disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="w-full btn-primary py-3 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FaKey />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Back Button (except on first step) */}
          {step > 1 && step < 3 && (
            <div className="mt-4 pt-4 border-t border-theme-border-primary">
              <button
                onClick={() => setStep(step - 1)}
                className="text-theme-text-secondary hover:text-theme-text-primary font-raleway text-sm"
              >
                ← Back to previous step
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PasswordManagementModal;
