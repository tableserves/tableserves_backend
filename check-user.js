require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const MenuCategory = require('./src/models/MenuCategory');
const ZoneShop = require('./src/models/ZoneShop');
const PlanValidationMiddleware = require('./src/middleware/planValidationMiddleware');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        const targetId = '68d59222a1d89f248d769058'; // balaji123@gmail.com

        // First, let's find all zone vendors/shops to see available users
        const users = await User.find({
            role: { $in: ['zone_vendor', 'zone_shop'] }
        }).limit(10);

        console.log('📋 Available zone users:');
        users.forEach((user, i) => {
            console.log(`${i + 1}. ${user.email} - ${user._id} (${user.role})`);
        });

        // Try to find the specific user
        const user = await User.findById(targetId);
        if (!user) {
            console.log(`\n❌ User ${targetId} not found`);
            console.log('Please use one of the IDs above to test');
            return;
        }

        console.log(`\n👤 Testing user: ${user.email} (${user.role})`);

        // Get user's plan
        const userPlan = await PlanValidationMiddleware.getUserPlan(targetId);
        console.log('\n📊 Plan Info:');
        console.log(`  Plan: ${userPlan.plan.planName}`);
        console.log(`  Max Categories: ${userPlan.plan.limits.maxCategories}`);

        // For zone admin, find their zone and shops
        const Zone = require('./src/models/Zone');
        const zone = await Zone.findOne({ adminId: targetId });

        if (zone) {
            console.log(`\n� Zoone: ${zone.name}`);

            // Find shops in this zone
            const zoneShops = await ZoneShop.find({ zoneId: zone._id });
            console.log(`\n🏪 Shops in zone: ${zoneShops.length}`);

            for (const shop of zoneShops) {
                const categoryCount = await MenuCategory.countDocuments({ shopId: shop._id });
                console.log(`\n📊 Shop: ${shop.name}`);
                console.log(`  Current Categories: ${categoryCount}`);
                console.log(`  Max Categories: ${userPlan.plan.limits.maxCategories}`);

                if (categoryCount >= userPlan.plan.limits.maxCategories) {
                    console.log('  ❌ LIMIT REACHED - Button should be BLOCKED');
                } else {
                    console.log('  ✅ Can create more categories');
                }

                // List categories
                const categories = await MenuCategory.find({ shopId: shop._id });
                categories.forEach((cat, i) => {
                    console.log(`    ${i + 1}. ${cat.name}`);
                });
            }
        } else {
            console.log('\n❌ No zone found for this admin');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();