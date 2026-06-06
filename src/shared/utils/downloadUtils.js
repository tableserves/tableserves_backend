
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const downloadPdf = async (element, fileName = 'receipt.pdf', options = {}) => {
  if (!element) {
    const error = new Error("Download failed: The element to capture is null.");
    console.error(error.message);
    throw error;
  }

  // Detect receipt type based on element class or data attribute
  const isThermalReceipt = element.classList.contains('thermal-receipt') ||
    element.dataset.receiptType === 'thermal' ||
    options.type === 'thermal';

  const isCustomerReceipt = element.classList.contains('customer-receipt') ||
    element.dataset.receiptType === 'customer' ||
    options.type === 'customer';

  console.log('Starting PDF generation for element:', {
    tagName: element.tagName,
    className: element.className,
    isThermalReceipt,
    isCustomerReceipt,
    offsetWidth: element.offsetWidth,
    offsetHeight: element.offsetHeight
  });

  try {
    // Wait for any pending renders and images to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Ensure all images are loaded
    const images = element.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 3000);
      });
    }));

    // Fixed dimensions for thermal receipt (80mm width)
    const THERMAL_WIDTH_MM = 80;
    const THERMAL_WIDTH_PX = 302; // 80mm at 96 DPI

    let canvasWidth, canvasHeight, pdfFormat;

    if (isThermalReceipt) {
      // Force fixed width for thermal receipts
      canvasWidth = THERMAL_WIDTH_PX;
      canvasHeight = element.scrollHeight;
      pdfFormat = [THERMAL_WIDTH_MM, (canvasHeight * THERMAL_WIDTH_MM) / canvasWidth];
    } else if (isCustomerReceipt) {
      // Customer receipt: Fixed A4 width (210mm) but dynamic height based on content
      const A4_WIDTH_MM = 210;
      const A4_WIDTH_PX = 794; // 210mm at 96 DPI
      canvasWidth = A4_WIDTH_PX;
      canvasHeight = element.scrollHeight;
      // Calculate dynamic height in mm based on actual content
      const dynamicHeightMM = (canvasHeight * A4_WIDTH_MM) / canvasWidth;
      pdfFormat = [A4_WIDTH_MM, dynamicHeightMM];
    } else {
      // Other receipts: Use element dimensions
      canvasWidth = element.scrollWidth;
      canvasHeight = element.scrollHeight;
      pdfFormat = [THERMAL_WIDTH_MM, (canvasHeight * THERMAL_WIDTH_MM) / canvasWidth];
    }

    console.log('Canvas dimensions:', { canvasWidth, canvasHeight, pdfFormat });

    // Generate canvas with fixed dimensions
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      scale: isThermalReceipt ? 3 : 2, // Higher scale for thermal receipts
      width: canvasWidth,
      height: canvasHeight,
      windowWidth: canvasWidth,
      windowHeight: canvasHeight,
      backgroundColor: '#ffffff',
      removeContainer: true,
      imageTimeout: 5000,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector('[data-html2canvas-clone]') || clonedDoc.body;
        if (clonedElement) {
          if (isThermalReceipt) {
            // Force fixed width for thermal receipt in cloned document
            clonedElement.style.width = `${THERMAL_WIDTH_PX}px`;
            clonedElement.style.maxWidth = `${THERMAL_WIDTH_PX}px`;
            clonedElement.style.minWidth = `${THERMAL_WIDTH_PX}px`;
            clonedElement.style.fontFamily = 'Courier New, monospace';
          } else if (isCustomerReceipt) {
            // Ensure customer receipt has proper A4 width but dynamic height
            clonedElement.style.width = '794px'; // A4 width at 96 DPI
            clonedElement.style.maxWidth = '794px';
            // Remove height constraints to allow dynamic sizing
          }
        }
      }
    });

    const imgData = canvas.toDataURL('image/png', 0.95);

    // Create PDF with appropriate format
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: pdfFormat,
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Add image to PDF - dynamic height based on content
    // The PDF format is already set to match content height, so just add the image
    const calculatedHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, calculatedHeight);

    // Force direct download without preview
    // Create blob and download link to bypass browser preview
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    console.log(`PDF "${fileName}" downloaded successfully (${isThermalReceipt ? '80mm thermal' : isCustomerReceipt ? 'A4 dynamic height' : 'standard'} format)`);
    return true;

  } catch (error) {
    console.error("Error generating PDF:", error);

    if (error.name === 'SecurityError') {
      throw new Error('PDF generation failed due to security restrictions. Please ensure all images are from the same domain.');
    } else if (error.message.includes('html2canvas')) {
      throw new Error('Failed to generate receipt image. Please try again or contact support.');
    } else if (error.message.includes('jsPDF')) {
      throw new Error('Failed to create PDF document. Please try again or contact support.');
    } else {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
};

export default downloadPdf;