const mongoose = require('mongoose');

/**
 * Payment Configuration Sub-Schema
 * Used for Razorpay Route (Linked Accounts) integration
 * Embedded in both Restaurant and ZoneShop models
 */
const paymentConfigSchema = new mongoose.Schema({
  
  // ── Razorpay Linked Account ──────────────────────────────
  linkedAccountId: {
    type: String,
    default: null,
    // e.g. acc_XXXXXXXXXXXXXXXX
    index: true
  },
  
  accountStatus: {
    type: String,
    enum: ['pending', 'created', 'activated', 'rejected', 'suspended'],
    default: 'pending',
  },
  
  kycStatus: {
    type: String,
    enum: ['pending', 'under_review', 'activated', 'needs_clarification', 'rejected'],
    default: 'pending',
  },
  
  settlementsEnabled: {
    type: Boolean,
    default: false,
  },
  
  liveModeEnabled: {
    type: Boolean,
    default: false,
  },
  
  razorpayDashboardUrl: {
    type: String,
    default: null,
  },

  // ── Platform Config ──────────────────────────────────────
  // Note: No commission on transactions - 100% goes to merchant
  // Platform revenue comes from subscription fees only
  commissionRate: {
    type: Number,
    default: 0,         // 0% commission - full amount to merchant
    min: 0,
    max: 100,
  },
  
  onboardingStep: {
    type: String,
    enum: ['details_pending', 'created', 'kyc_submitted', 'activated', 'live'],
    default: 'details_pending',
  },
  
  onboardedAt: {
    type: Date,
    default: null,
  },

  // ── Bank Details (display only — never raw) ───────────────
  bankName: {
    type: String,
    default: '',
  },
  
  maskedAccountNumber: {
    type: String,
    default: '',
    // e.g. "XXXX XXXX 1234"
  },
  
  ifscCode: {
    type: String,
    default: '',
    uppercase: true,
  },
  
  accountType: {
    type: String,
    enum: ['savings', 'current', ''],
    default: '',
  },

  // ── Business Information (for Razorpay) ───────────────────
  legalBusinessName: {
    type: String,
    default: '',
    trim: true,
  },
  
  businessType: {
    type: String,
    enum: ['individual', 'proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', ''],
    default: '',
  },
  
  // ── Audit Trail ───────────────────────────────────────────
  lastSyncedAt: {
    type: Date,
    default: null,
  },
  
  syncErrors: [{
    message: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],

}, { _id: false, timestamps: false });

// Virtual to check if account is ready for payments
paymentConfigSchema.virtual('isPaymentReady').get(function() {
  return this.settlementsEnabled && 
         this.accountStatus === 'activated' && 
         this.kycStatus === 'activated' &&
         this.linkedAccountId !== null;
});

// Virtual to get onboarding progress percentage
paymentConfigSchema.virtual('onboardingProgress').get(function() {
  const steps = {
    'details_pending': 0,
    'created': 25,
    'kyc_submitted': 50,
    'activated': 75,
    'live': 100,
  };
  return steps[this.onboardingStep] || 0;
});

module.exports = paymentConfigSchema;
