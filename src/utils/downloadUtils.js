
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const downloadPdf = (element, fileName = 'receipt.pdf') => {
  if (!element) {
    console.error("Download failed: The element to capture is null.");
    return;
  }

  const { scrollHeight, scrollWidth } = element;

  html2canvas(element, {
    useCORS: true, // Attempt to load cross-origin images
    scale: 2, // Increase resolution for better quality
    width: scrollWidth,
    height: scrollHeight,
    windowWidth: scrollWidth,
    windowHeight: scrollHeight,
  }).then((canvas) => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(fileName);
  }).catch(error => {
    console.error("Error generating canvas with html2canvas:", error);
  });
};
export default downloadPdf;  