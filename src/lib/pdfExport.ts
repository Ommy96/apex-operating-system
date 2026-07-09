import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Render a DOM node to a paginated, branded PDF.
 * Extracted from DonorProgressReport so all scope-aware donor
 * reports share the same output style.
 */
export async function exportNodeToPdf(
  node: HTMLElement,
  filename: string,
  opts: { footer?: string } = {},
): Promise<void> {
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const imgW = pdfW - 20;
  const imgH = (canvas.height * imgW) / canvas.width;
  const footer = opts.footer ?? "CONFIDENTIAL — Donor report";

  pdf.setFontSize(8);
  pdf.setTextColor(120);

  if (imgH <= pdfH - 30) {
    pdf.addImage(imgData, "PNG", 10, 10, imgW, imgH);
    pdf.text(footer, pdfW / 2, pdfH - 8, { align: "center" });
    pdf.text("Page 1", pdfW - 15, pdfH - 8);
  } else {
    let page = 1;
    let srcY = 0;
    while (srcY < canvas.height) {
      const sliceH = Math.min(canvas.height - srcY, (canvas.width * (pdfH - 30)) / imgW);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceH;
      slice.getContext("2d")!.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (page > 1) pdf.addPage();
      const renderedH = (sliceH * imgW) / canvas.width;
      pdf.addImage(slice.toDataURL("image/png"), "PNG", 10, 10, imgW, renderedH);
      pdf.text(footer, pdfW / 2, pdfH - 8, { align: "center" });
      pdf.text(`Page ${page}`, pdfW - 15, pdfH - 8);
      srcY += sliceH;
      page++;
    }
  }
  pdf.save(filename);
}