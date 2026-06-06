import { useEffect } from 'react';

/**
 * Component to dynamically load Razorpay checkout script
 * This ensures Razorpay is available when needed for payments
 */
const RazorpayScript = () => {
  useEffect(() => {
    // Check if Razorpay script is already loaded
    if (typeof window.Razorpay !== 'undefined') {
      return;
    }

    // Check if script is already in the document
    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      return;
    }

    // Create and add the script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      console.log('✅ Razorpay checkout script loaded successfully');
    };

    script.onerror = () => {
      console.error('❌ Failed to load Razorpay checkout script');
    };

    document.head.appendChild(script);

    // Cleanup function to remove script when component unmounts
    return () => {
      const scriptElement = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (scriptElement) {
        document.head.removeChild(scriptElement);
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default RazorpayScript;
