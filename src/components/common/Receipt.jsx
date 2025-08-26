
import React from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';

const Receipt = React.forwardRef(({ orderDetails, qrCodeValue }, ref) => {
  const {
    restaurantName = 'The Gourmet Place',
    restaurantAddress = '123 Culinary Lane, Foodie City, 12345',
    restaurantPhone = '+1 (555) 123-4567',
    orderId = 'TS12345XYZ',
    date = new Date().toLocaleString(),
    tableNumber = 'A5',
    items = [
      { name: 'Classic Burger', quantity: 2, price: 12.50 },
      { name: 'Crispy Fries', quantity: 1, price: 4.00 },
      { name: 'Soda', quantity: 2, price: 2.00 },
    ],
    paymentMethod = 'Credit Card',
    discount = 5.00, // Example discount
    subtotal,
    taxes,
    total,
  } = orderDetails || {};

  // Use provided totals or calculate from items
  const finalSubtotal = subtotal || items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTax = taxes || (finalSubtotal * 0.10); // 10% tax
  const finalTotal = total || (finalSubtotal - discount + finalTax);

  return (
    <div ref={ref} className="p-8 sm:p-10 bg-white text-gray-900 max-w-2xl mx-auto font-raleway shadow-2xl rounded-2xl border border-gray-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/5 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-6 -translate-x-6"></div>
      
      {/* Header */}
      <div className="text-center mb-10 relative z-10">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-accent to-red-500 bg-clip-text text-transparent font-fredoka mb-3">
            TableServe
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-accent to-red-500 mx-auto rounded-full"></div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 font-fredoka mb-3">{restaurantName}</h2>
        <div className="space-y-1 text-gray-600">
          <p className="text-sm sm:text-base font-medium">{restaurantAddress}</p>
          <p className="text-sm sm:text-base font-medium">{restaurantPhone}</p>
        </div>
      </div>

      {/* Order Info */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 mb-8 relative z-10">
        <h3 className="text-lg font-bold text-gray-800 font-fredoka mb-4 text-center">Order Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Order ID</p>
            <p className="text-sm sm:text-base font-bold text-accent font-mono">{orderId}</p>
          </div>
          <div className="text-center">
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Date & Time</p>
            <p className="text-sm sm:text-base font-bold text-gray-800">{new Date(date).toLocaleDateString()}</p>
            <p className="text-xs text-gray-600">{new Date(date).toLocaleTimeString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Table</p>
            <p className="text-sm sm:text-base font-bold text-accent">{tableNumber}</p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-8 relative z-10">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 font-fredoka mb-6 text-center">Your Order</h3>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-4 px-6 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 font-fredoka text-lg">{item.name}</h4>
                  <p className="text-sm text-gray-600 font-raleway mt-1">
                    {item.quantity} × ₹{item.price.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-accent font-fredoka">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 font-raleway">No items in this order.</p>
            </div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 mb-8 relative z-10">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-raleway text-lg">Subtotal</span>
            <span className="font-bold text-lg text-gray-800 font-fredoka">₹{finalSubtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-green-600 font-raleway text-lg font-medium">Discount</span>
              <span className="font-bold text-lg text-green-600 font-fredoka">-₹{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-raleway text-lg">Tax (10%)</span>
            <span className="font-bold text-lg text-gray-800 font-fredoka">₹{finalTax.toFixed(2)}</span>
          </div>
          <div className="border-t-2 border-gray-200 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-800 font-fredoka">Total</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-accent to-red-500 bg-clip-text text-transparent font-fredoka">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center relative z-10">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mb-6">
          <p className="text-lg font-bold text-gray-800 font-fredoka mb-2">
            Payment Method: <span className="text-accent">{paymentMethod}</span>
          </p>
          <div className="w-12 h-1 bg-gradient-to-r from-accent to-red-500 mx-auto rounded-full"></div>
        </div>
        
        {qrCodeValue && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
            <QRCode 
              value={qrCodeValue} 
              size={150} 
              bgColor="#ffffff" 
              fgColor="#000000" 
              level="L"
              className="mx-auto mb-4"
            />
            <p className="text-sm text-gray-600 font-raleway">Scan for feedback or special offers!</p>
          </div>
        )}
        
        <div className="space-y-3">
          <h4 className="text-2xl font-bold text-gray-800 font-fredoka">
            Thank you for dining with us!
          </h4>
          <p className="text-gray-600 font-raleway">We hope you enjoyed your meal</p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <span>Follow us</span>
            <span className="font-bold text-accent">@tableserve</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Receipt;
