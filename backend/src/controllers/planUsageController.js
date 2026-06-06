const catchAsync = require('../utils/catchAsync');
const PlanValidationMiddleware = require('../middleware/planValidationMiddleware');
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');
const ZoneShop = require('../models/ZoneShop');
const Zone = require('../models/Zone');
const {APIError} = require('../utils/apiError');

class PlanUsageController {
  /**
   * Get current plan usage for the authenticated user
   */
  static getCurrentUsage = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { ownerType, ownerId } = req.params;

    // Get user's plan information
    const userPlan = await PlanValidationMiddleware.getUserPlan(userId);
    
    if (!userPlan) {
      throw new APIError('Unable to determine user plan', 500);
    }

    // Count current usage based on ownerType
    let currentUsage = {};
    
    switch (ownerType) {
      case 'restaurant':
        currentUsage = {
          categories: await MenuCategory.countDocuments({ restaurantId: ownerId }),
          menuItems: await MenuItem.countDocuments({ restaurantId: ownerId })
        };
        break;
        
      case 'zone':
        // For zone, count categories and items across all shops in the zone
        const zoneShops = await ZoneShop.find({ zoneId: ownerId });
        const shopIds = zoneShops.map(shop => shop._id);
        
        currentUsage = {
          shops: zoneShops.length,
          categories: await MenuCategory.countDocuments({ 
            $or: [
              { zoneId: ownerId },
              { shopId: { $in: shopIds } }
            ]
          }),
          menuItems: await MenuItem.countDocuments({ 
            $or: [
              { zoneId: ownerId },
              { shopId: { $in: shopIds } }
            ]
          })
        };
        break;
        
      case 'shop':
        currentUsage = {
          categories: await MenuCategory.countDocuments({ shopId: ownerId }),
          menuItems: await MenuItem.countDocuments({ shopId: ownerId })
        };
        break;
        
      default:
        throw new APIError('Invalid owner type', 400);
    }

    // Calculate limits and availability
    const limits = userPlan.plan.limits;
    const availability = {
      canCreateCategory: limits.maxCategories === null || limits.maxCategories === -1 || 
                        currentUsage.categories < limits.maxCategories,
      canCreateMenuItem: limits.maxMenuItems === null || limits.maxMenuItems === -1 || 
                        currentUsage.menuItems < limits.maxMenuItems,
      canCreateShop: limits.maxShops === null || limits.maxShops === -1 || 
                     (currentUsage.shops || 0) < limits.maxShops
    };

    // Calculate remaining counts
    const remaining = {
      categories: limits.maxCategories === null || limits.maxCategories === -1 ? 
                  'unlimited' : Math.max(0, limits.maxCategories - currentUsage.categories),
      menuItems: limits.maxMenuItems === null || limits.maxMenuItems === -1 ? 
                 'unlimited' : Math.max(0, limits.maxMenuItems - currentUsage.menuItems),
      shops: limits.maxShops === null || limits.maxShops === -1 ? 
             'unlimited' : Math.max(0, limits.maxShops - (currentUsage.shops || 0))
    };

    res.status(200).json({
      success: true,
      data: {
        plan: {
          name: userPlan.plan.planName,
          key: userPlan.plan.planKey,
          type: userPlan.plan.planType,
          status: userPlan.status
        },
        limits: limits,
        currentUsage: currentUsage,
        remaining: remaining,
        availability: availability,
        ownerType: ownerType,
        ownerId: ownerId
      }
    });
  });

  /**
   * Check if user can perform a specific action
   */
  static checkActionAvailability = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { action, ownerType, ownerId } = req.params;

    const userPlan = await PlanValidationMiddleware.getUserPlan(userId);
    
    if (!userPlan) {
      throw new APIError('Unable to determine user plan', 500);
    }

    let canPerform = false;
    let message = '';
    let currentCount = 0;
    let maxAllowed = 0;

    switch (action) {
      case 'create-category':
        maxAllowed = userPlan.plan.limits.maxCategories;
        
        if (maxAllowed === null || maxAllowed === -1) {
          canPerform = true;
          message = 'Unlimited categories allowed';
        } else {
          switch (ownerType) {
            case 'restaurant':
              currentCount = await MenuCategory.countDocuments({ restaurantId: ownerId });
              break;
            case 'zone':
              currentCount = await MenuCategory.countDocuments({ zoneId: ownerId });
              break;
            case 'shop':
              currentCount = await MenuCategory.countDocuments({ shopId: ownerId });
              break;
          }
          
          canPerform = currentCount < maxAllowed;
          message = canPerform ? 
            `You can create ${maxAllowed - currentCount} more categories` :
            `Category limit reached. Your ${userPlan.plan.planName} plan allows ${maxAllowed} categories. You currently have ${currentCount}.`;
        }
        break;

      case 'create-menu-item':
        maxAllowed = userPlan.plan.limits.maxMenuItems;
        
        if (maxAllowed === null || maxAllowed === -1) {
          canPerform = true;
          message = 'Unlimited menu items allowed';
        } else {
          const { categoryId } = req.query;
          if (categoryId) {
            currentCount = await MenuItem.countDocuments({ categoryId: categoryId });
          } else {
            switch (ownerType) {
              case 'restaurant':
                currentCount = await MenuItem.countDocuments({ restaurantId: ownerId });
                break;
              case 'zone':
                currentCount = await MenuItem.countDocuments({ zoneId: ownerId });
                break;
              case 'shop':
                currentCount = await MenuItem.countDocuments({ shopId: ownerId });
                break;
            }
          }
          
          canPerform = currentCount < maxAllowed;
          message = canPerform ? 
            `You can create ${maxAllowed - currentCount} more menu items` :
            `Menu item limit reached. Your ${userPlan.plan.planName} plan allows ${maxAllowed} menu items per category.`;
        }
        break;

      default:
        throw new APIError('Invalid action specified', 400);
    }

    res.status(200).json({
      success: true,
      data: {
        action: action,
        canPerform: canPerform,
        message: message,
        currentCount: currentCount,
        maxAllowed: maxAllowed === null || maxAllowed === -1 ? 'unlimited' : maxAllowed,
        plan: {
          name: userPlan.plan.planName,
          key: userPlan.plan.planKey
        }
      }
    });
  });
}

module.exports = PlanUsageController;