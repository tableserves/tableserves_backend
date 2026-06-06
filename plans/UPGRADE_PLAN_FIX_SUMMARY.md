# Upgrade Plan Display Fix

## Problem
The upgrade plan UI was showing incorrect plans based on the user's current subscription:
- **Basic users** were seeing the Basic plan (their current plan) instead of only Advanced and Premium
- **Advanced users** were seeing Basic and Advanced plans instead of only Premium
- **Premium users** were correctly showing only Premium (no issue here)
- **Free users** were correctly showing all paid plans (no issue here)

## Root Cause
The plan filtering logic in `UpgradeTab.jsx` was too simple - it showed all paid plans regardless of the user's current plan tier.

```javascript
// OLD (INCORRECT) LOGIC:
if (isPremiumUser) {
  availablePlans = Object.values(allPlans).filter(plan => plan.key === 'premium');
} else {
  // This showed ALL paid plans to everyone
  availablePlans = Object.values(allPlans).filter(plan => 
    plan.key !== 'free' && plan.priceINR !== null
  );
}
```

## Solution
Implemented tier-based filtering that only shows higher-tier plans as upgrade options:

```javascript
// NEW (CORRECT) LOGIC:
if (isPremiumUser) {
  // Premium users: show only premium (current plan)
  availablePlans = Object.values(allPlans).filter(plan => plan.key === 'premium');
} else if (currentPlan === 'advanced') {
  // Advanced users: show only premium as upgrade option
  availablePlans = Object.values(allPlans).filter(plan => plan.key === 'premium');
} else if (currentPlan === 'basic') {
  // Basic users: show advanced and premium
  availablePlans = Object.values(allPlans).filter(plan => 
    (plan.key === 'advanced' || plan.key === 'premium') && plan.priceINR !== null
  );
} else {
  // Free users: show all paid plans (basic, advanced, premium)
  availablePlans = Object.values(allPlans).filter(plan => 
    plan.key !== 'free' && plan.priceINR !== null
  );
}
```

## Upgrade Path Logic

### Free Plan Users
**Shows**: Basic, Advanced, Premium
**Recommended**: Basic (best next step)

### Basic Plan Users
**Shows**: Advanced, Premium
**Recommended**: Advanced (next tier up)
**Hidden**: Basic (current plan)

### Advanced Plan Users
**Shows**: Premium
**Recommended**: Premium (only upgrade option)
**Hidden**: Basic, Advanced (current and lower tiers)

### Premium Plan Users
**Shows**: Premium (current plan status)
**Recommended**: None (already at top tier)
**Hidden**: All lower tiers

## Additional Improvements

### Smart Recommendation Badge
Updated the recommendation logic to show the appropriate "RECOMMENDED" badge:

```javascript
let isRecommended = false;
if (currentPlan === 'free' && plan.key === 'basic') {
  isRecommended = true; // Recommend basic for free users
} else if (currentPlan === 'basic' && plan.key === 'advanced') {
  isRecommended = true; // Recommend advanced for basic users
} else if (currentPlan === 'advanced' && plan.key === 'premium') {
  isRecommended = true; // Recommend premium for advanced users
}
```

## Files Modified
- `src/components/subscription/UpgradeTab.jsx`

## Testing Checklist

### ✅ Free Plan User
- [ ] Should see: Basic, Advanced, Premium plans
- [ ] Basic plan should have "RECOMMENDED" badge
- [ ] All three plans should show "Upgrade to [Plan]" button

### ✅ Basic Plan User
- [ ] Should see: Advanced, Premium plans only
- [ ] Should NOT see: Basic plan
- [ ] Advanced plan should have "RECOMMENDED" badge
- [ ] Current plan status should show "Current Plan: Basic"

### ✅ Advanced Plan User
- [ ] Should see: Premium plan only
- [ ] Should NOT see: Basic, Advanced plans
- [ ] Premium plan should have "RECOMMENDED" badge
- [ ] Current plan status should show "Current Plan: Advanced"

### ✅ Premium Plan User
- [ ] Should see: Premium plan with "CURRENT PLAN" badge
- [ ] Should NOT see: Basic, Advanced plans
- [ ] Should show special premium status section
- [ ] No upgrade options (already at top tier)

## Visual Indicators

### Current Plan Badge
- **Green gradient** background
- "CURRENT PLAN" label in top-right
- Disabled button showing "Current Plan"

### Recommended Plan Badge
- **Orange gradient** background
- "RECOMMENDED" label in top-right
- Highlighted with orange accent colors

### Other Plans
- **Blue gradient** background
- Standard styling
- Active "Upgrade to [Plan]" button

## Benefits

1. **Clear Upgrade Path**: Users only see plans they can upgrade to
2. **No Confusion**: Current plan is never shown as an upgrade option
3. **Smart Recommendations**: Next tier is always highlighted
4. **Better UX**: Cleaner interface with relevant options only
5. **Logical Progression**: Free → Basic → Advanced → Premium

## Example Scenarios

### Scenario 1: Basic User Wants to Upgrade
**Before Fix**: Sees Basic (current), Advanced, Premium
**After Fix**: Sees only Advanced (recommended), Premium
**Result**: ✅ Clear that Advanced is the next step

### Scenario 2: Advanced User Wants to Upgrade
**Before Fix**: Sees Basic, Advanced (current), Premium
**After Fix**: Sees only Premium (recommended)
**Result**: ✅ Only one upgrade option - Premium

### Scenario 3: Premium User Checks Upgrade Page
**Before Fix**: Might see lower tier plans
**After Fix**: Sees only Premium status with special messaging
**Result**: ✅ Confirms they're at the top tier

## Notes

- The fix maintains backward compatibility with existing subscription data
- Works for both restaurant and zone plan types
- Handles edge cases like missing plan data gracefully
- Premium users get a special congratulatory UI showing their status
