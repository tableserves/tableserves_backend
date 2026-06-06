import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

class InvoiceService {
  /**
   * Universal Print Function
   */
  static async printReceipt(invoiceElement, orderData, options = {}) {
    try {
      const { type = 'thermal' } = options;
      
      const printWindow = window.open('', '_blank', 
        type === 'thermal' ? 'width=320,height=600' : 'width=900,height=800'
      );
      
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Extract styles with special handling for tables
      let styles = this.extractStylesForPrinting(type);

      // Calculate exact width for thermal receipts
      const width = type === 'thermal' ? '80mm' : '210mm';
      const fontSize = type === 'thermal' ? '10px' : '12px';
      const lineHeight = type === 'thermal' ? '1.2' : '1.4';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt - ${orderData?.orderNumber || 'Order'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-size: ${fontSize};
              line-height: ${lineHeight};
              font-family: ${type === 'thermal' ? '"Courier New", monospace' : '"Inter", "Segoe UI", sans-serif'};
            }
            
            body {
              margin: 0;
              padding: 0;
              background: white;
              color: #000;
              width: ${width};
              max-width: ${width};
            }
            
            @page {
              size: ${type === 'thermal' ? '80mm auto' : 'A4'};
              margin: ${type === 'thermal' ? '0' : '10mm'};
            }
            
            @media print {
              body {
                width: ${width};
                max-width: ${width};
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print { display: none !important; }
            }
            
            /* Table-specific fixes for alignment */
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed; /* Critical for consistent column widths */
            }
            
            th, td {
              padding: 4px 2px;
              text-align: left;
              white-space: normal;
            }
            
            /* Thermal receipt specific alignment */
            @media screen and (max-width: 320px), print {
              ${type === 'thermal' ? `
                table {
                  table-layout: fixed;
                }
                
                td:nth-child(1), th:nth-child(1) { width: 5%; }
                td:nth-child(2), th:nth-child(2) { width: 55%; }
                td:nth-child(3), th:nth-child(3) { width: 10%; }
                td:nth-child(4), th:nth-child(4) { width: 10%; }
                td:nth-child(5), th:nth-child(5) { width: 20%; }
                
                /* Force monospace character width */
                body {
                  letter-spacing: 0;
                  word-spacing: 0;
                }
              ` : ''}
            }
            
            ${styles}
          </style>
        </head>
        <body>
          ${invoiceElement.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                // For thermal receipts, add a small delay for content to fully render
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            };
          </script>
        </body>
        </html>
      `);

      printWindow.document.close();
      return true;
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Failed to print receipt. Please try again.');
      return false;
    }
  }

  /**
   * Extract styles with special handling for tables
   */
  static extractStylesForPrinting(type) {
    let styles = '';
    try {
      styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules || [])
              .map(rule => {
                // Skip rules that might cause alignment issues
                if (rule.cssText.includes('position') || 
                    rule.cssText.includes('transform') || 
                    rule.cssText.includes('overflow')) {
                  return '';
                }
                return rule.cssText;
              })
              .filter(Boolean)
              .join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');
    } catch (e) {
      console.warn('Could not extract all styles:', e);
    }
    
    // Add specific table fixes
    styles += `
      /* Critical table alignment fixes */
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      
      th, td {
        padding: 4px 2px;
        text-align: left;
        white-space: normal;
      }
      
      /* Thermal receipt column widths */
      @media print, screen {
        ${type === 'thermal' ? `
          td:nth-child(1), th:nth-child(1) { width: 5%; }
          td:nth-child(2), th:nth-child(2) { width: 55%; }
          td:nth-child(3), th:nth-child(3) { width: 10%; }
          td:nth-child(4), th:nth-child(4) { width: 10%; }
          td:nth-child(5), th:nth-child(5) { width: 20%; }
        ` : ''}
      }
      
      /* Ensure proper font rendering */
      body {
        font-family: ${type === 'thermal' ? '"Courier New", monospace' : '"Inter", "Segoe UI", sans-serif'};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `;
    
    return styles;
  }

  /**
   * Universal Download Function - FIXED FOR BOTH RECEIPTS
   */
  static async downloadReceipt(invoiceElement, orderData, options = {}) {
    try {
      const { type = 'thermal' } = options;
      const filename = `receipt-${orderData?.orderNumber || 'order'}-${Date.now()}`;

      console.log('Generating PDF...');

      // Create optimized container for rendering
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.zIndex = '-9999';
      container.style.overflow = 'hidden';
      
      // Copy font styles from body for consistent rendering
      const bodyStyle = window.getComputedStyle(document.body);
      container.style.fontFamily = type === 'thermal' ? 
        '"Courier New", monospace' : 
        bodyStyle.fontFamily;
      container.style.fontSize = type === 'thermal' ? '10px' : '12px';
      container.style.color = '#000';
      container.style.lineHeight = type === 'thermal' ? '1.2' : '1.4';
      container.style.backgroundColor = '#ffffff';
      container.style.letterSpacing = type === 'thermal' ? '0' : 'normal';
      
      // Set precise width based on receipt type
      const containerWidth = type === 'thermal' ? '302px' : '794px';
      container.style.width = containerWidth;

      // Clone and prepare the element
      const clone = invoiceElement.cloneNode(true);
      clone.style.background = 'white';
      clone.style.margin = '0';
      clone.style.padding = type === 'thermal' ? '0' : '20px';
      clone.style.width = '100%';
      clone.style.maxWidth = '100%';
      clone.style.boxSizing = 'border-box';
      clone.style.color = '#000';
      clone.style.overflow = 'hidden';
      
      // Force table layout to fixed for proper alignment
      const tables = clone.querySelectorAll('table');
      tables.forEach(table => {
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
        
        // Add explicit column widths for thermal receipts
        if (type === 'thermal') {
          const columns = table.querySelectorAll('tr:first-child th, tr:first-child td');
          if (columns.length > 0) {
            columns[0].style.width = '5%';
            columns[1].style.width = '55%';
            columns[2].style.width = '10%';
            columns[3].style.width = '10%';
            columns[4].style.width = '20%';
            
            // Apply to all rows
            table.querySelectorAll('tr').forEach(row => {
              if (row.children.length >= 5) {
                row.children[0].style.width = '5%';
                row.children[1].style.width = '55%';
                row.children[2].style.width = '10%';
                row.children[3].style.width = '10%';
                row.children[4].style.width = '20%';
              }
            });
          }
        }
      });

      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 400));

      // Get actual rendered height
      const actualHeight = container.offsetHeight;

      // Generate high-quality canvas
      const canvas = await html2canvas(container, {
        scale: type === 'thermal' ? 4 : 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: container.offsetWidth,
        height: actualHeight,
        windowWidth: container.offsetWidth,
        windowHeight: actualHeight,
        removeContainer: false,
        imageTimeout: 0,
        foreignObjectRendering: false
      });

      // Clean up
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png', 1.0);
      let pdf;

      if (type === 'thermal') {
        // Thermal: 80mm width, exact content height
        const mmWidth = 80;
        const mmHeight = (canvas.height * mmWidth) / canvas.width;

        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [mmWidth, Math.max(mmHeight, 100)],
          compress: true
        });

        pdf.addImage(imgData, 'PNG', 0, 0, mmWidth, mmHeight, '', 'FAST');
      } else {
        // Customer: A4 with proper centering
        const a4Width = 210;
        const a4Height = 297;
        const margin = 15;
        const contentWidth = a4Width - (2 * margin);
        const contentHeight = (canvas.height * contentWidth) / canvas.width;
        const maxContentHeight = a4Height - (2 * margin);

        if (contentHeight <= maxContentHeight) {
          // Center content vertically
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
          });
          
          // Calculate vertical centering
          const yOffset = margin + (maxContentHeight - contentHeight) / 2;
          
          pdf.addImage(imgData, 'PNG', margin, yOffset, contentWidth, contentHeight, '', 'FAST');
        } else {
          // Dynamic height for tall content
          const dynamicHeight = contentHeight + (2 * margin);
          
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [a4Width, dynamicHeight],
            compress: true
          });
          
          pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight, '', 'FAST');
        }
      }

      pdf.save(`${filename}.pdf`);
      console.log('PDF downloaded successfully');
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
      return false;
    }
  }

  // Convenience methods
  static async downloadThermalReceipt(invoiceElement, orderData) {
    return this.downloadReceipt(invoiceElement, orderData, { type: 'thermal' });
  }

  static async printThermalReceipt(invoiceElement, orderData) {
    return this.printReceipt(invoiceElement, orderData, { type: 'thermal' });
  }

  static async downloadCustomerReceipt(invoiceElement, orderData) {
    return this.downloadReceipt(invoiceElement, orderData, { type: 'customer' });
  }

  static async printCustomerReceipt(invoiceElement, orderData) {
    return this.printReceipt(invoiceElement, orderData, { type: 'customer' });
  }

  // Legacy methods
  static async downloadOrderInvoice(invoiceElement, orderData, options = {}) {
    const type = options.format === 'a4' || options.format === 'a5' ? 'customer' : 'thermal';
    return this.downloadReceipt(invoiceElement, orderData, { type });
  }

  static async printOrderInvoice(invoiceElement, orderData) {
    return this.printReceipt(invoiceElement, orderData, { type: 'thermal' });
  }
}

export default InvoiceService;