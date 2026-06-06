import React from 'react';

const OrderInvoice = React.forwardRef(({ orderData, businessInfo }, ref) => {
  // Format currency helper
  const formatReceiptCurrency = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };

  // Enhanced business info extraction with fallbacks
  const extractBusinessInfo = () => {
    if (businessInfo) {
      return {
        name: businessInfo.name || 'TableServe Business',
        address: businessInfo.address || 'Business Address',
        phone: businessInfo.phone || '',
        email: businessInfo.email || 'business@tableserve.com',
        gstin: businessInfo.gstin || '',
        type: businessInfo.type || 'restaurant'
      };
    }

    const od = orderData || {};

    // Check for shop information first (highest priority for invoices)
    if (od.shop || od.shopId || od.shopName) {
      const shop = od.shop || od.shopId;
      return {
        name: shop?.name || od.shopName || 'Zone Shop',
        address: shop?.address || shop?.contactInfo?.address || od.shopAddress || 'Shop Address, Zone Location',
        phone: shop?.phone || shop?.contactInfo?.phone || od.shopPhone || '',
        email: shop?.email || shop?.contactInfo?.email || od.shopEmail || 'shop@tableserve.com',
        gstin: shop?.gstin || '',
        type: 'shop'
      };
    }

    // Check for zone information
    if (od.zone || od.zoneId || od.zoneName) {
      const zone = od.zone || od.zoneId;
      return {
        name: zone?.name || od.zoneName || 'Food Zone',
        address: zone?.address || zone?.location || zone?.contactInfo?.address || od.zoneAddress || 'Zone Location',
        phone: zone?.phone || zone?.contactInfo?.phone || od.zonePhone || '',
        email: zone?.email || zone?.contactInfo?.email || od.zoneEmail || 'zone@tableserve.com',
        gstin: zone?.gstin || '',
        type: 'zone'
      };
    }

    // Check for restaurant information (most common case)
    if (od.restaurant || od.restaurantId || od.restaurantName) {
      const restaurant = od.restaurant || od.restaurantId;
      
      // Extract address from contact object if available
      let addressStr = '';
      if (restaurant?.contact?.address) {
        const addr = restaurant.contact.address;
        const parts = [];
        if (addr.street) parts.push(addr.street);
        if (addr.city) parts.push(addr.city);
        if (addr.state) parts.push(addr.state);
        if (addr.zipCode) parts.push(addr.zipCode);
        addressStr = parts.join(', ');
      }
      
      return {
        name: restaurant?.name || od.restaurantName || 'TableServe Restaurant',
        address: addressStr || restaurant?.address || od.restaurantAddress || 'Restaurant Address, City',
        phone: restaurant?.phone || restaurant?.contact?.phone || od.restaurantPhone || '',
        email: restaurant?.email || restaurant?.contact?.email || od.restaurantEmail || 'restaurant@tableserve.com',
        gstin: restaurant?.gstin || '',
        type: 'restaurant'
      };
    }

    return {
      name: od.businessName || 'TableServe Business',
      address: od.businessAddress || 'Business Address',
      phone: od.businessPhone || '',
      email: od.businessEmail || 'business@tableserve.com',
      gstin: od.gstin || '',
      type: 'business'
    };
  };

  const businessDetails = extractBusinessInfo();

  // Destructure with fallbacks
  const {
    orderNumber = orderData?.orderNumber || orderData?.id || orderData?._id || 'TS12345XYZ',
    customer = orderData?.customer || {},
    items = orderData?.items || [],
    tableNumber = orderData?.tableNumber || orderData?.table || 'A5',
    createdAt = orderData?.createdAt || orderData?.orderTime || orderData?.timing?.orderPlaced || new Date().toISOString(),
  } = orderData || {};

  // Pricing fallbacks
  const pricing = orderData?.pricing || {};
  const discount = pricing?.discount?.amount || orderData?.discount || 0;
  const subtotal = pricing?.subtotal || orderData?.subtotal;
  const taxes = pricing?.tax?.amount || pricing?.taxes || orderData?.taxes || orderData?.tax || 0;
  const serviceFee = pricing?.serviceFee?.amount || 0;
  const total = pricing?.total || orderData?.total;

  // Calculate totals robustly
  const calculateTotals = () => {
    const itemsSubtotal = Array.isArray(items)
      ? items.reduce((sum, item) => {
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 0;
          return sum + price * qty;
        }, 0)
      : 0;

    const finalSubtotal = Number(subtotal) || itemsSubtotal;
    const finalDiscount = Number(discount) || 0;
    const finalTax = Number(taxes) || 0;
    const finalServiceFee = Number(serviceFee) || 0;
    const finalTotal = Number(total) || (finalSubtotal - finalDiscount + finalTax + finalServiceFee);

    return {
      subtotal: finalSubtotal,
      discount: finalDiscount,
      tax: finalTax,
      serviceFee: finalServiceFee,
      total: finalTotal
    };
  };

  const totals = calculateTotals();

  // Format date/time
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const formattedDateTime = formatDate(createdAt);

  // Truncate items for print
  const displayItems = Array.isArray(items) ? items : [];
  const maxItemsToShow = 20;
  const visibleItems = displayItems.slice(0, maxItemsToShow);
  const hiddenItemsCount = Math.max(0, displayItems.length - maxItemsToShow);

  return (
    <div
      ref={ref}
      className="bg-white text-black"
      style={{
        width: '80mm',
        maxWidth: '80mm',
        margin: '0 auto',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.4',
        padding: '0'
      }}
    >
      {/* Header - Business Info */}
      <div className="text-center border-b-2 border-black pb-2 pt-2 px-2">
        <h1 className="text-base font-bold mb-1 uppercase" style={{ letterSpacing: '1px' }}>
          {businessDetails.name}
        </h1>
        {businessDetails.address && (
          <p className="text-xs leading-tight">{businessDetails.address}</p>
        )}
        {businessDetails.phone && (
          <p className="text-xs mt-0.5">Ph: {businessDetails.phone}</p>
        )}
        {businessDetails.email && (
          <p className="text-xs mt-0.5">{businessDetails.email}</p>
        )}
       
      </div>

      {/* Order Details */}
      <div className="px-2 py-2 border-b border-dashed border-black">
        <div className="text-xs space-y-0.5">
          <div className="flex justify-between">
            <span className="font-bold">Order Number:</span>
            <span>{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span>{formattedDateTime.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Time:</span>
            <span>{formattedDateTime.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Table:</span>
            <span>{tableNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Customer:</span>
            <span>{customer.name || 'Walk-in'}</span>
          </div>
          {customer.phone && (
            <div className="flex justify-between">
              <span className="font-bold">Phone:</span>
              <span>{customer.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="px-2 py-2">
        <div className="border-b-2 border-black pb-1 mb-2">
          <div className="flex text-xs font-bold">
            <div style={{ width: '45%' }}>ITEM</div>
            <div style={{ width: '18%', textAlign: 'right', paddingRight: '4px' }}>RATE</div>
            <div style={{ width: '12%', textAlign: 'center' }}>QTY</div>
            <div style={{ width: '25%', textAlign: 'right' }}>AMOUNT</div>
          </div>
        </div>

        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => {
            const itemPrice = Number(item.price) || 0;
            const itemQuantity = Number(item.quantity) || 0;
            const itemTotal = itemPrice * itemQuantity;

            return (
              <div key={index} className="mb-2 text-xs border-b border-dotted border-gray-400 pb-1">
                <div className="flex">
                  <div style={{ width: '45%' }}>
                    <div className="font-bold">{item.name || 'Item'}</div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-xs text-gray-700 ml-2 mt-0.5">
                        {item.modifiers.map((mod, idx) => (
                          <div key={idx}>+ {mod.name || mod}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ width: '18%', textAlign: 'right', paddingRight: '4px' }}>{formatReceiptCurrency(itemPrice)}</div>
                  <div style={{ width: '12%', textAlign: 'center' }}>{itemQuantity}</div>
                  <div style={{ width: '25%', textAlign: 'right' }} className="font-bold">
                    {formatReceiptCurrency(itemTotal)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-3 text-xs">No items</div>
        )}

        {hiddenItemsCount > 0 && (
          <div className="text-center text-gray-600 py-1 text-xs italic border-b border-dotted border-gray-400">
            + {hiddenItemsCount} more item{hiddenItemsCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="px-2 py-2 border-t-2 border-black">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between font-bold">
            <span>Sub Total:</span>
            <span>{formatReceiptCurrency(totals.subtotal)}</span>
          </div>

          {totals.serviceFee > 0 && (
            <div className="flex justify-between">
              <span>Service Charge:</span>
              <span>{formatReceiptCurrency(totals.serviceFee)}</span>
            </div>
          )}

          {totals.discount > 0 && (
            <div className="flex justify-between text-red-600 font-bold">
              <span>Discount:</span>
              <span>- {formatReceiptCurrency(totals.discount)}</span>
            </div>
          )}

          {totals.tax > 0 && (
            <>
              <div className="flex justify-between text-xs">
                <span>CGST @ 2.5%:</span>
                <span>{formatReceiptCurrency(totals.tax / 2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>SGST @ 2.5%:</span>
                <span>{formatReceiptCurrency(totals.tax / 2)}</span>
              </div>
            </>
          )}

          <div className="border-t-2 border-black pt-1 mt-2">
            <div className="flex justify-between font-bold text-sm">
              <span>GRAND TOTAL:</span>
              <span>{formatReceiptCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="px-2 py-2 border-t-2 border-dashed border-black">
        <p className="text-xs font-bold mb-1">IMPORTANT:</p>
        <div className="text-xs space-y-0.5">
          <p>• Computer generated invoice</p>
          <p>• Goods once sold cannot be returned</p>
          <p>• Thank you for your visit!</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t-2 border-black py-2 px-2">
        <p className="text-xs font-bold mb-1">*** THANK YOU ***</p>
        <p className="text-xs mb-1">Visit Again!</p>
        <div className="pt-1 border-t border-dotted border-black mt-1">
          <p className="text-xs">
            Powered by <span className="font-bold">TableServe</span>
          </p>
        </div>
      </div>
    </div>
  );
});

OrderInvoice.displayName = 'OrderInvoice';

export default OrderInvoice;