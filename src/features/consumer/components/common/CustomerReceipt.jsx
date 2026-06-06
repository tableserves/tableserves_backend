import React from 'react';
import logo from '../../../../assets/logowithtitle.png';

const CustomerReceipt = React.forwardRef(({ orderDetails }, ref) => {
  // Validate orderDetails
  if (!orderDetails) {
    console.warn('CustomerReceipt: No orderDetails provided');
    return (
      <div ref={ref} className="bg-white text-black max-w-[320px] mx-auto p-6 border border-gray-200">
        <h2 className="text-lg font-bold text-center uppercase">Error</h2>
        <p className="text-sm text-center mt-2">Missing Order Details</p>
      </div>
    );
  }

  const formatReceiptCurrency = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };

  const convertToWords = (amount) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (amount === 0) return 'Zero Rupees';

    const num = Math.floor(amount);
    if (num >= 10000000) return 'Rupees ' + num.toLocaleString('en-IN');

    let words = '';

    if (num >= 100000) {
      const lakhs = Math.floor(num / 100000);
      words += ones[lakhs] + ' Lakh ';
    }

    const remainder = num % 100000;
    if (remainder >= 1000) {
      const thousands = Math.floor(remainder / 1000);
      if (thousands >= 20) {
        words += tens[Math.floor(thousands / 10)] + ' ';
        if (thousands % 10 > 0) words += ones[thousands % 10] + ' ';
      } else if (thousands >= 10) {
        words += teens[thousands - 10] + ' ';
      } else {
        words += ones[thousands] + ' ';
      }
      words += 'Thousand ';
    }

    const lastThree = num % 1000;
    if (lastThree >= 100) {
      words += ones[Math.floor(lastThree / 100)] + ' Hundred ';
    }

    const lastTwo = num % 100;
    if (lastTwo >= 20) {
      words += tens[Math.floor(lastTwo / 10)] + ' ';
      if (lastTwo % 10 > 0) words += ones[lastTwo % 10];
    } else if (lastTwo >= 10) {
      words += teens[lastTwo - 10];
    } else if (lastTwo > 0) {
      words += ones[lastTwo];
    }

    return words.trim() + ' Rupees';
  };

  const extractBusinessInfo = (orderDetails) => {
    if (!orderDetails) {
      return { name: '', address: '', phone: '', email: '' };
    }

    if (orderDetails?.zone && typeof orderDetails.zone === 'object' && orderDetails.zone.name) {
      const zoneData = orderDetails.zone;
      return {
        name: zoneData.name || '',
        address: zoneData.address || zoneData.location || zoneData.contactInfo?.address || '',
        phone: zoneData.phone || zoneData.contactInfo?.phone || zoneData.contact?.phone || '',
        email: zoneData.email || zoneData.contactInfo?.email || zoneData.contact?.email || ''
      };
    }

    if (orderDetails?.zoneId && typeof orderDetails.zoneId === 'object' && orderDetails.zoneId.name) {
      const zoneData = orderDetails.zoneId;
      return {
        name: zoneData.name || '',
        address: zoneData.address || zoneData.location || zoneData.contactInfo?.address || zoneData.contact?.address || '',
        phone: zoneData.phone || zoneData.contactInfo?.phone || zoneData.contact?.phone || '',
        email: zoneData.email || zoneData.contactInfo?.email || zoneData.contact?.email || ''
      };
    }

    if (orderDetails?.zoneName) {
      return {
        name: orderDetails.zoneName || '',
        address: orderDetails.zoneAddress || orderDetails.zoneLocation || orderDetails.zone?.location || '',
        phone: orderDetails.zonePhone || orderDetails.zoneContactPhone || orderDetails.zone?.contactInfo?.phone || '',
        email: orderDetails.zoneEmail || orderDetails.zone?.contactInfo?.email || ''
      };
    }

    if (orderDetails?.restaurant && typeof orderDetails.restaurant === 'object') {
      const restData = orderDetails.restaurant;
      const addressParts = [];
      if (restData.contact?.address) {
        if (restData.contact.address.street) addressParts.push(restData.contact.address.street);
        if (restData.contact.address.city) addressParts.push(restData.contact.address.city);
        if (restData.contact.address.state) addressParts.push(restData.contact.address.state);
        if (restData.contact.address.zipCode) addressParts.push(restData.contact.address.zipCode);
      }
      return {
        name: restData.name || '',
        address: restData.address || addressParts.join(', ') || '',
        phone: restData.phone || restData.contact?.phone || '',
        email: restData.email || restData.contact?.email || ''
      };
    }

    if (orderDetails?.restaurantId && typeof orderDetails.restaurantId === 'object' && orderDetails.restaurantId.name) {
      const restData = orderDetails.restaurantId;
      const addressParts = [];
      if (restData.contact?.address) {
        if (restData.contact.address.street) addressParts.push(restData.contact.address.street);
        if (restData.contact.address.city) addressParts.push(restData.contact.address.city);
        if (restData.contact.address.state) addressParts.push(restData.contact.address.state);
        if (restData.contact.address.zipCode) addressParts.push(restData.contact.address.zipCode);
      }
      return {
        name: restData.name || '',
        address: restData.address || addressParts.join(', ') || '',
        phone: restData.phone || restData.contact?.phone || '',
        email: restData.email || restData.contact?.email || ''
      };
    }

    if (orderDetails?.restaurantName) {
      return {
        name: orderDetails.restaurantName || '',
        address: orderDetails.restaurantAddress || '',
        phone: orderDetails.restaurantPhone || '',
        email: orderDetails.restaurantEmail || ''
      };
    }

    if (orderDetails?.shop && typeof orderDetails.shop === 'object') {
      const shopData = orderDetails.shop;
      return {
        name: shopData.name || '',
        address: shopData.address || shopData.contactInfo?.address || '',
        phone: shopData.phone || shopData.contactInfo?.phone || '',
        email: shopData.email || shopData.contactInfo?.email || ''
      };
    }

    if (orderDetails?.shopId && typeof orderDetails.shopId === 'object' && orderDetails.shopId.name) {
      const shopData = orderDetails.shopId;
      return {
        name: shopData.name || '',
        address: shopData.address || shopData.contactInfo?.address || '',
        phone: shopData.phone || shopData.contactInfo?.phone || '',
        email: shopData.email || shopData.contactInfo?.email || ''
      };
    }

    if (orderDetails?.shopName) {
      return {
        name: orderDetails.shopName || '',
        address: orderDetails.shopAddress || '',
        phone: orderDetails.shopPhone || '',
        email: orderDetails.shopEmail || ''
      };
    }

    if (orderDetails?.venue && typeof orderDetails.venue === 'object') {
      return {
        name: orderDetails.venue.name || '',
        address: orderDetails.venue.address || '',
        phone: orderDetails.venue.phone || '',
        email: orderDetails.venue.email || ''
      };
    }

    return { name: '', address: '', phone: '', email: '' };
  };

  const businessInfo = extractBusinessInfo(orderDetails);

  const {
    orderId = orderDetails?.orderNumber || orderDetails?.id || orderDetails?._id || 'TS12345XYZ',
    date = orderDetails?.createdAt || orderDetails?.orderTime || new Date().toISOString(),
    tableNumber = orderDetails?.tableNumber || orderDetails?.table || 'N/A',
    items = orderDetails?.items || [],
    discount = orderDetails?.discount || orderDetails?.pricing?.discount?.amount || 0,
    subtotal = orderDetails?.subtotal || orderDetails?.pricing?.subtotal,
    taxes = orderDetails?.taxes || orderDetails?.tax || orderDetails?.pricing?.tax?.amount || orderDetails?.pricing?.tax || 0,
    total = orderDetails?.total || orderDetails?.pricing?.total,
    customerName = orderDetails?.customerName || orderDetails?.customer?.name || 'Guest',
    customerPhone = orderDetails?.customerPhone || orderDetails?.customer?.phone || orderDetails?.phone || ''
  } = orderDetails || {};

  const calculateTotals = () => {
    const validItems = Array.isArray(items) ? items : [];
    const itemsSubtotal = validItems.reduce((sum, item) => {
      const itemPrice = Number(item.price) || 0;
      const itemQuantity = Number(item.quantity) || 0;
      return sum + (itemPrice * itemQuantity);
    }, 0);

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
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: 'N/A', time: 'N/A' };

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, '0');

      return {
        date: `${day}/${month}/${year}`,
        time: `${hoursStr}:${minutes} ${ampm}`
      };
    } catch (error) {
      console.error('Date formatting error:', error);
      return { date: 'N/A', time: 'N/A' };
    }
  };

  const formattedDateTime = formatDate(date);

  return (
    <div 
      ref={ref} 
      className="bg-white text-black print:shadow-none"
      style={{ 
        width: '80mm', // Standard thermal printer width
        maxWidth: '340px',
        margin: '0 auto',
        padding: '24px 16px',
        fontFamily: "'Inter', 'Helvetica Neue', Helvetica, sans-serif"
      }}
    >
      {/* ─── HEADER (Business Info) ─── */}
      <div className="flex flex-col items-center text-center mb-6">
        <h1 className="text-xl font-black uppercase tracking-widest leading-tight mb-2">
          {businessInfo.name || 'RECEIPT'}
        </h1>
        
        {businessInfo.address && (
          <p className="text-[11px] leading-tight text-gray-800 mt-2 uppercase max-w-[250px]">
            {businessInfo.address}
          </p>
        )}
        {(businessInfo.phone || businessInfo.email) && (
          <div className="text-[11px] mt-2 text-gray-700 uppercase">
            {businessInfo.phone && <span>TEL: {businessInfo.phone}</span>}
            {businessInfo.phone && businessInfo.email && <span className="mx-1">|</span>}
            {businessInfo.email && <span>{businessInfo.email}</span>}
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-400 my-4"></div>

      {/* ─── ORDER DETAILS ─── */}
      <div className="text-[12px] leading-relaxed uppercase space-y-1.5">
        <div className="flex justify-between">
          <span className="text-gray-600">Table No:</span>
          <span className="font-bold">{tableNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Order No:</span>
          <span className="font-bold">{orderId}</span>
        </div>
        {customerName !== 'Guest' && (
          <div className="flex justify-between">
            <span className="text-gray-600">Customer:</span>
            <span className="font-semibold">{customerName}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-400 my-4"></div>

      {/* ─── ITEMIZED LIST ─── */}
      <div className="text-[12px]">
        {/* Table Header */}
        <div className="flex justify-between font-bold mb-3 uppercase border-b border-gray-800 pb-1.5">
          <div className="flex-1 text-left">ITEM</div>
          <div className="w-12 text-center">QTY</div>
          <div className="w-20 text-right">AMT</div>
        </div>

        {/* Table Body */}
        <div className="space-y-3 mt-2">
          {Array.isArray(items) && items.length > 0 ? (
            items.map((item, index) => {
              const itemPrice = Number(item.price) || 0;
              const itemQuantity = Number(item.quantity) || 0;
              const itemTotal = itemPrice * itemQuantity;

              return (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <div className="font-semibold uppercase leading-tight">{item.name || 'Item'}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">@ {formatReceiptCurrency(itemPrice)}</div>
                  </div>
                  <div className="w-12 text-center mt-0.5">{itemQuantity}</div>
                  <div className="w-20 text-right font-medium mt-0.5">
                    {itemTotal.toFixed(2)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-2 italic text-[11px]">No items found</div>
          )}
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-4"></div>

      {/* ─── TOTALS ─── */}
      <div className="text-[12px] uppercase space-y-2 mt-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">{totals.subtotal.toFixed(2)}</span>
        </div>
        
        {totals.discount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Discount</span>
            <span className="font-semibold text-green-600">-{totals.discount.toFixed(2)}</span>
          </div>
        )}
        
        {totals.tax > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span className="font-semibold">{totals.tax.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t border-gray-800 mt-3 pt-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[14px]">TOTAL</span>
            <span className="font-black text-[18px]">{formatReceiptCurrency(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-5"></div>

      {/* ─── FOOTER ─── */}
      <div className="text-center text-[11px] space-y-1">
        <p className="font-bold uppercase tracking-wider text-[13px] mt-4 mb-2">Thank You!</p>
        <p className="text-gray-600">Please visit us again</p>
        <div className="text-[10px] text-gray-400">
          Powered by <span className="font-serif italic font-bold text-accent">TableServes</span>
        </div>
      </div>
    </div>
  );
});

CustomerReceipt.displayName = 'CustomerReceipt';

export default CustomerReceipt;