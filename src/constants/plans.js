// Subscription plan definitions for restaurants and zones

export const RESTAURANT_PLANS = {
  free: {
    key: 'free',
    label: 'Free Starter',
    planType: 'restaurant',
    maxTables: 1,
    maxCategories: 1,
    maxMenuItems: 2,
    priceINR: 0,
    features: {
      crudMenu: true, // Basic menu management allowed
      branding: false,
      analytics: false,
      qrGeneration: true, // Basic QR generation allowed
      qrCustomization: false, // No customization
      modifiers: false,
      watermark: true,
    },
  },
  basic: {
    key: 'basic',
    label: 'Basic',
    planType: 'restaurant',
    maxTables: 5,
    maxCategories: 8,
    maxMenuItems: 10, // per category
    priceINR: 299,
    features: {
      crudMenu: true,
      branding: true, // Standard QR customization
      analytics: false,
      qrCustomization: true,
      modifiers: true,
      watermark: false,
      orderTracking: true,
    },
  },
  advanced: {
    key: 'advanced',
    label: 'Advanced',
    planType: 'restaurant',
    maxTables: 8,
    maxCategories: 15,
    maxMenuItems: 20, // per category
    priceINR: 1299,
    features: {
      crudMenu: true,
      branding: true, // Premium QR customization
      analytics: true,
      qrCustomization: true,
      modifiers: true,
      watermark: false,
      orderTracking: true,
      prioritySupport: true,
      premiumBranding: true,
    },
  },
  premium: {
    key: 'premium',
    label: 'Premium',
    planType: 'restaurant',
    maxTables: null, // Custom - managed by super admin
    priceINR: null, // Contact for pricing
    features: {
      crudMenu: true,
      branding: true,
      analytics: true,
      qrGeneration: true, // Allow QR generation
      qrCustomization: true, // Allow QR customization
      customTables: true,
      prioritySupport: true,
      superAdminManaged: true,
    },
  },
};

export const ZONE_PLANS = {
  free: {
    key: 'free',
    label: 'Free Starter',
    planType: 'zone',
    maxTables: 1,
    maxShops: 1, // vendors
    maxVendors: 1,
    maxCategories: 1,
    maxMenuItems: 1,
    priceINR: 0,
    features: {
      crudMenu: true, // Basic menu management allowed
      vendorManagement: true, // Basic vendor management
      analytics: false,
      qrGeneration: true, // Basic QR generation allowed
      qrCustomization: false,
      modifiers: false,
      watermark: true,
    },
  },
  basic: {
    key: 'basic',
    label: 'Basic',
    planType: 'zone',
    maxTables: 5,
    maxShops: 5, // vendors
    maxVendors: 5,
    maxCategories: 8,
    maxMenuItems: 10, // per category
    priceINR: 999,
    features: {
      crudMenu: true,
      qrGeneration: true, // Allow QR generation
      vendorManagement: true, // basic
      analytics: false,
      qrCustomization: true,
      modifiers: true,
      watermark: false,
      menuManagement: true,
      orderTracking: true,
    },
  },
  advanced: {
    key: 'advanced',
    label: 'Advanced',
    planType: 'zone',
    maxTables: 8,
    maxShops: 8, // vendors
    maxVendors: 8,
    maxCategories: 15,
    maxMenuItems: 20, // per category
    priceINR: 1999,
    features: {
      crudMenu: true,
      qrGeneration: true, // Allow QR generation
      vendorManagement: true, // with vendor credentials
      analytics: true,
      qrCustomization: true, // shop branding
      modifiers: true,
      watermark: false,
      menuManagement: true,
      prioritySupport: true,
      premiumBranding: true,
    },
  },
  premium: {
    key: 'premium',
    label: 'Premium',
    planType: 'zone',
    maxTables: null, // Unlimited
    maxShops: null, // Unlimited vendors
    maxVendors: null, // Unlimited
    maxCategories: null, // Unlimited
    maxMenuItems: null, // Unlimited
    priceINR: null, // Contact for pricing
    features: {
      crudMenu: true,
      qrGeneration: true, // Allow QR generation
      qrCustomization: true, // Allow QR customization
      vendorManagement: true,
      analytics: true,
      modifiers: true,
      superAdminCRUD: true,
      splitCart: true,
      prioritySupport: true,
      watermark: false,
    },
  },
};

export function getDefaultPlanForType(planType) {
  return planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;
}

export function getFreePlanForType(planType) {
  return planType === 'zone' ? ZONE_PLANS.free : RESTAURANT_PLANS.free;
}

export function getPaidPlansForType(planType) {
  const allPlans = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
  return Object.values(allPlans).filter(plan => plan.priceINR > 0 && plan.priceINR !== null);
}

export function resolvePlanMetadata({ planKey, planType, custom = {} }) {
  const source = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;
  const base = source[planKey] || getDefaultPlanForType(planType);
  return {
    plan: base.key,
    planType: base.planType,
    label: base.label,
    priceINR: base.priceINR,
    maxTables: base.maxTables ?? custom.maxTables ?? 0,
    maxVendors: base.planType === 'zone' ? (base.maxVendors ?? custom.maxVendors ?? 0) : undefined,
    features: base.features,
    status: 'active',
    startedAt: new Date().toISOString(),
  };
}

