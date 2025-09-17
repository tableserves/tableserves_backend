require('dotenv').config();

console.log('Environment Variables Check:');
console.log('==========================');
console.log('PORT:', process.env.PORT || 8080);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);