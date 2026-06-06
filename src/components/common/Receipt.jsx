import React from 'react';
import { formatReceiptCurrency } from '../../shared/format/currencyUtils';

const Receipt = React.forwardRef(({ orderDetails }, ref) => {
  // Enhanced data extraction - returns empty strings instead of placeholders
  const extractBusinessInfo = (orderDetails) => {
    // Check for zone information first (higher priority)
    if (orderDetails?.zone && typeof orderDetails.zone === 'object' && orderDetails.zone.name) {
      const zoneData = orderDetails.zone;
      const addressParts = [];
      if (zoneData.address) addressParts.push(zoneData.address);
      else if (zoneData.location) addressParts.push(zoneData.location);
      else if (zoneData.contactInfo?.address) addressParts.push(zoneData.contactInfo.address);
      
      return {
        name: zoneData.name || '',
        address: addressParts.join(', ') || '',
        phone: zoneData.phone || zoneData.contactInfo?.phone || zoneData.contact?.phone || '',
        email: zoneData.email || zoneData.contactInfo?.email || zoneData.contact?.email || '',
        gstin: zoneData.gstin || zoneData.taxInfo?.gstin || ''
      };
    }

    if (orderDetails?.zoneId && typeof orderDetails.zoneId === 'object' && orderDetails.zoneId.name) {
      const zoneData = orderDetails.zoneId;
      const addressParts = [];
      if (zoneData.address) addressParts.push(zoneData.address);
      else if (zoneData.location) addressParts.push(zoneData.location);
      else if (zoneData.contactInfo?.address) addressParts.push(zoneData.contactInfo.address);
      else if (zoneData.contact?.address) addressParts.push(zoneData.contact.address);
      
      return {
        name: zoneData.name || '',
        address: addressParts.join(', ') || '',
        phone: zoneData.phone || zoneData.contactInfo?.phone || zoneData.contact?.phone || '',
        email: zoneData.email || zoneData.contactInfo?.email || zoneData.contact?.email || '',
        gstin: zoneData.gstin || zoneData.taxInfo?.gstin || ''
      };
    }

    if (orderDetails?.zoneName) {
      return {
        name: orderDetails.zoneName || '',
        address: orderDetails.zoneAddress || orderDetails.zoneLocation || orderDetails.zone?.location || '',
        phone: orderDetails.zonePhone || orderDetails.zoneContactPhone || orderDetails.zone?.contactInfo?.phone || '',
        email: orderDetails.zoneEmail || orderDetails.zone?.contactInfo?.email || '',
        gstin: orderDetails.zoneGstin || orderDetails.zone?.taxInfo?.gstin || ''
      };
    }

    // Check for restaurant information
    if (orderDetails?.restaurant && typeof orderDetails.restaurant === 'object') {
      const restData = orderDetails.restaurant;
      const addressParts = [];
      if (restData.address) {
        addressParts.push(restData.address);
      } else if (restData.contact?.address) {
        if (restData.contact.address.street) addressParts.push(restData.contact.address.street);
        if (restData.contact.address.city) addressParts.push(restData.contact.address.city);
        if (restData.contact.address.state) addressParts.push(restData.contact.address.state);
        if (restData.contact.address.zipCode) addressParts.push(restData.contact.address.zipCode);
      }
      return {
        name: restData.name || '',
        address: addressParts.join(', ') || '',
        phone: restData.phone || restData.contact?.phone || '',
        email: restData.email || restData.contact?.email || '',
        gstin: restData.gstin || restData.taxInfo?.gstin || ''
      };
    }

    if (orderDetails?.restaurantId && typeof orderDetails.restaurantId === 'object' && orderDetails.restaurantId.name) {
      const restData = orderDetails.restaurantId;
      const addressParts = [];
      if (restData.address) {
        addressParts.push(restData.address);
      } else if (restData.contact?.address) {
        if (restData.contact.address.street) addressParts.push(restData.contact.address.street);
        if (restData.contact.address.city) addressParts.push(restData.contact.address.city);
        if (restData.contact.address.state) addressParts.push(restData.contact.address.state);
        if (restData.contact.address.zipCode) addressParts.push(restData.contact.address.zipCode);
      }
      return {
        name: restData.name || '',
        address: addressParts.join(', ') || '',
        phone: restData.phone || restData.contact?.phone || '',
        email: restData.email || restData.contact?.email || '',
        gstin: restData.gstin || restData.taxInfo?.gstin || ''
      };
    }

    if (orderDetails?.restaurantName) {
      return {
        name: orderDetails.restaurantName || '',
        address: orderDetails.restaurantAddress || '',
        phone: orderDetails.restaurantPhone || '',
        email: orderDetails.restaurantEmail || '',
        gstin: orderDetails.restaurantGstin || ''
      };
    }

    // Check for shop information
    if (orderDetails?.shop && typeof orderDetails.shop === 'object') {
      const shopData = orderDetails.shop;
      return {
        name: shopData.name || '',
        address: shopData.address || shopData.contactInfo?.address || '',
        phone: shopData.phone || shopData.contactInfo?.phone || '',
        email: shopData.email || shopData.contactInfo?.email || '',
        gstin: shopData.gstin || shopData.taxInfo?.gstin || ''
      };
    }

    if (orderDetails?.shopId && typeof orderDetails.shopId === 'object' && orderDetails.shopId.name) {
      const shopData = orderDetails.shopId;
      return {
        name: shopData.name || '',
        address: shopData.address || shopData.contactInfo?.address || '',
        phone: shopData.phone || shopData.contactInfo?.phone || '',
        email: shopData.email || shopData.contactInfo?.email || '',
        gstin: shopData.gstin || shopData.taxInfo?.gstin || ''
      };
    }

    if (orderDetails?.shopName) {
      return {
        name: orderDetails.shopName || '',
        address: orderDetails.shopAddress || '',
        phone: orderDetails.shopPhone || '',
        email: orderDetails.shopEmail || '',
        gstin: orderDetails.shopGstin || ''
      };
    }

    // Fallback to venue information
    if (orderDetails?.venue && typeof orderDetails.venue === 'object') {
      return {
        name: orderDetails.venue.name || '',
        address: orderDetails.venue.address || '',
        phone: orderDetails.venue.phone || '',
        email: orderDetails.venue.email || '',
        gstin: orderDetails.venue.gstin || ''
      };
    }

    return {
      name: orderDetails?.businessName || '',
      address: orderDetails?.businessAddress || '',
      phone: orderDetails?.businessPhone || '',
      email: orderDetails?.businessEmail || '',
      gstin: orderDetails?.gstin || ''
    };
  };

  const businessInfo = extractBusinessInfo(orderDetails);

  const {
    orderId = orderDetails?.orderNumber || orderDetails?.id || orderDetails?._id || 'TS12345XYZ',
    date = orderDetails?.createdAt || orderDetails?.orderTime || orderDetails?.timing?.orderPlaced || new Date().toISOString(),
    tableNumber = orderDetails?.tableNumber || orderDetails?.table || 'A5',
    items = orderDetails?.items || [],
    paymentMethod = orderDetails?.paymentMethod || orderDetails?.payment?.method || 'Digital Payment',
    discount = orderDetails?.discount || orderDetails?.pricing?.discount?.amount || 0,
    subtotal = orderDetails?.subtotal || orderDetails?.pricing?.subtotal,
    taxes = orderDetails?.taxes || orderDetails?.tax || orderDetails?.pricing?.tax?.amount || orderDetails?.pricing?.taxes,
    total = orderDetails?.total || orderDetails?.pricing?.total,
    orderType = orderDetails?.orderType || orderDetails?.type || 'dine-in',
    specialInstructions = orderDetails?.specialInstructions || orderDetails?.instructions || orderDetails?.delivery?.instructions || '',
    customerName = orderDetails?.customerName || orderDetails?.customer?.name || 'Valued Customer',
    customerPhone = orderDetails?.customerPhone || orderDetails?.customer?.phone || ''
  } = orderDetails || {};

  const calculateTotals = () => {
    const itemsSubtotal = Array.isArray(items) ? items.reduce((sum, item) => {
      const itemPrice = Number(item.price) || 0;
      const itemQuantity = Number(item.quantity) || 0;
      return sum + (itemPrice * itemQuantity);
    }, 0) : 0;

    const finalSubtotal = Number(subtotal) || itemsSubtotal;
    const finalTax = Number(taxes) || 0;
    const finalDiscount = Number(discount) || 0;
    const finalTotal = Number(total) || (finalSubtotal - finalDiscount + finalTax);

    return {
      subtotal: finalSubtotal,
      tax: finalTax,
      discount: finalDiscount,
      total: finalTotal
    };
  };

  const totals = calculateTotals();

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

  const formattedDateTime = formatDate(date);

  const displayItems = Array.isArray(items) ? items : [];
  const maxItemsToShow = 15;
  const visibleItems = displayItems.slice(0, maxItemsToShow);
  const hiddenItemsCount = Math.max(0, displayItems.length - maxItemsToShow);

  return (
    <div ref={ref} className="thermal-receipt bg-white text-gray-900 border-2 border-gray-800" data-receipt-type="thermal" style={{ fontSize: '10px', lineHeight: '1.3', width: '302px', maxWidth: '302px', minWidth: '302px', fontFamily: 'Courier New, monospace', margin: '0 auto' }}>
      {/* Header - Business Info */}
      <div className="text-center border-b-2 border-gray-800 pb-2 pt-3 px-3">
        {businessInfo.name && businessInfo.name.trim() !== '' && (
          <h1 className="text-sm font-bold mb-1 text-gray-900 uppercase tracking-wide">{businessInfo.name}</h1>
        )}
        {businessInfo.address && businessInfo.address.trim() !== '' && (
          <p className="text-xs text-gray-700 leading-tight">{businessInfo.address}</p>
        )}
        {businessInfo.phone && businessInfo.phone.trim() !== '' && (
          <p className="text-xs text-gray-700 mt-0.5">Ph: {businessInfo.phone}</p>
        )}
        {businessInfo.email && businessInfo.email.trim() !== '' && (
          <p className="text-xs text-gray-700 mt-0.5">{businessInfo.email}</p>
        )}
        {businessInfo.gstin && businessInfo.gstin.trim() !== '' && (
          <p className="text-xs text-gray-700 mt-0.5 font-semibold">GSTIN: {businessInfo.gstin}</p>
        )}
        {!businessInfo.name && !businessInfo.address && !businessInfo.phone && (
          <p className="text-xs text-gray-500 italic">Business information not available</p>
        )}
        <div className="mt-2 pt-2 border-t border-gray-500">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">RECEIPT</h2>
        </div>
      </div>

      {/* Invoice Details Section */}
      <div className="px-3 py-2 border-b border-gray-500">
        <div className="text-xs space-y-0.5">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Bill #:</span>
            <span className="text-gray-800">{orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Date:</span>
            <span className="text-gray-800">{formattedDateTime.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Time:</span>
            <span className="text-gray-800">{formattedDateTime.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Table:</span>
            <span className="text-gray-800">{tableNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Customer:</span>
            <span className="text-gray-800">{customerName}</span>
          </div>
          {customerPhone && (
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Phone:</span>
              <span className="text-gray-800">{customerPhone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Type:</span>
            <span className="text-gray-800 uppercase">{orderType}</span>
          </div>
        </div>
      </div>

      {/* Items Table - Fixed column widths for alignment */}
      <div className="px-3 py-2">
        <table className="w-full text-xs" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-1 font-bold text-gray-900" style={{ width: '50%', paddingRight: '4px' }}>Item</th>
              <th className="text-center py-1 font-bold text-gray-900" style={{ width: '15%', paddingLeft: '2px', paddingRight: '2px' }}>Qty</th>
              <th className="text-right py-1 font-bold text-gray-900" style={{ width: '35%', paddingLeft: '4px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length > 0 ? visibleItems.map((item, index) => {
              const itemPrice = Number(item.price) || 0;
              const itemQuantity = Number(item.quantity) || 0;
              const itemTotal = itemPrice * itemQuantity;

              return (
                <tr key={index} className="border-b border-gray-300">
                  <td className="py-1 text-gray-800" style={{ width: '50%', paddingRight: '4px', wordWrap: 'break-word' }}>
                    <div className="font-medium">{item.name || 'Unknown Item'}</div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-gray-600" style={{ fontSize: '9px', marginTop: '2px' }}>
                        {item.modifiers.slice(0, 2).map((mod, idx) => (
                          <div key={idx}>+ {mod.name}</div>
                        ))}
                        {item.modifiers.length > 2 && (
                          <div>+ {item.modifiers.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-1 text-center text-gray-800 font-medium" style={{ width: '15%', paddingLeft: '2px', paddingRight: '2px' }}>{itemQuantity}</td>
                  <td className="py-1 text-right text-gray-800 font-medium" style={{ width: '35%', paddingLeft: '4px' }}>{formatReceiptCurrency(itemTotal)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="3" className="text-center text-gray-500 py-3">No items found</td>
              </tr>
            )}

            {hiddenItemsCount > 0 && (
              <tr className="border-b border-gray-300">
                <td colSpan="3" className="text-center text-gray-600 py-1 text-xs italic">
                  + {hiddenItemsCount} more item{hiddenItemsCount > 1 ? 's' : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Special Instructions */}
      {specialInstructions && (
        <div className="px-3 py-2 border-t border-gray-500 bg-gray-100">
          <p className="text-xs font-semibold text-gray-900 mb-0.5">Special Instructions:</p>
          <p className="text-xs text-gray-700 italic">{specialInstructions}</p>
        </div>
      )}

      {/* Totals Section - Fixed alignment */}
      <div className="px-3 py-2 border-t-2 border-gray-800">
        <table className="w-full text-xs" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="py-1 text-gray-900 font-semibold" style={{ width: '60%' }}>Subtotal</td>
              <td className="py-1 text-right text-gray-800 font-medium" style={{ width: '40%' }}>{formatReceiptCurrency(totals.subtotal)}</td>
            </tr>

            {totals.discount > 0 && (
              <tr className="border-b border-gray-300">
                <td className="py-1 text-gray-900 font-semibold" style={{ width: '60%' }}>Discount</td>
                <td className="py-1 text-right text-red-600 font-medium" style={{ width: '40%' }}>-{formatReceiptCurrency(totals.discount)}</td>
              </tr>
            )}

            {totals.tax > 0 ? (
              <>
                <tr className="border-b border-gray-200">
                  <td className="py-1 text-gray-800" style={{ width: '60%' }}>SGST/UTGST (2.5%)</td>
                  <td className="py-1 text-right text-gray-700 font-medium" style={{ width: '40%' }}>{formatReceiptCurrency(totals.tax / 2)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1 text-gray-800" style={{ width: '60%' }}>CGST (2.5%)</td>
                  <td className="py-1 text-right text-gray-700 font-medium" style={{ width: '40%' }}>{formatReceiptCurrency(totals.tax / 2)}</td>
                </tr>
                <tr className="border-b-2 border-gray-500">
                  <td className="py-1 text-gray-900 font-semibold" style={{ width: '60%' }}>Total Tax</td>
                  <td className="py-1 text-right text-gray-900 font-semibold" style={{ width: '40%' }}>{formatReceiptCurrency(totals.tax)}</td>
                </tr>
              </>
            ) : null}

            <tr className="border-b-2 border-gray-900">
              <td className="py-2 text-gray-900 font-bold text-sm" style={{ width: '60%' }}>TOTAL</td>
              <td className="py-2 text-right text-gray-900 font-bold text-sm" style={{ width: '40%' }}>{formatReceiptCurrency(totals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Information */}
      <div className="px-3 py-2 border-t border-gray-500 bg-gray-100">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-gray-900 font-semibold">Payment:</span>
          <span className="text-gray-800 font-medium">{paymentMethod}</span>
        </div>
        <div className="text-center">
          <span className="inline-block bg-gray-900 text-white px-3 py-1 text-xs font-bold uppercase">
            PAID
          </span>
        </div>
      </div>

      {/* Notes Section */}
      <div className="px-3 py-2 border-t border-gray-500">
        <p className="text-xs text-gray-700 font-semibold mb-1">NOTE:</p>
        <div className="text-xs text-gray-600 space-y-0.5">
          <p>• This is a computer generated receipt</p>
          <p>• No Tax Payable under Reverse Charge</p>
        </div>
      </div>

      {/* Footer - Compact with no extra spacing */}
      <div className="text-center border-t-2 border-gray-800 py-2 px-3">
        <p className="text-xs font-bold text-gray-900 mb-0.5">Thank You!</p>
        <p className="text-xs text-gray-700 mb-1">Visit Again</p>
        <div className="pt-1 border-t border-gray-500 mt-1">
          <p className="text-xs text-gray-600 mb-0">Powered by <span className="font-semibold">TableServe</span></p>
        </div>
      </div>
    </div>
  );
});

export default Receipt;