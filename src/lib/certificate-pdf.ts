import jsPDF from "jspdf";
import QRCode from "qrcode";

export type CertificateData = {
  employeeName: string;
  courseName: string;
  completionDate: string;
  certificateNumber: string;
  organizationName: string;
  organizationLogo?: string | null;
};

const GREEN: [number, number, number] = [29, 122, 62];

export async function buildCertificatePdf(data: CertificateData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(6);
  doc.rect(24, 24, w - 48, h - 48);
  doc.setLineWidth(1);
  doc.rect(38, 38, w - 76, h - 76);

  if (data.organizationLogo) {
    try {
      doc.addImage(data.organizationLogo, "PNG", w / 2 - 30, 60, 60, 60);
    } catch {
      /* logo optional */
    }
  }

  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.organizationName || "PeoHub", w / 2, data.organizationLogo ? 145 : 100, {
    align: "center",
  });

  doc.setFontSize(30);
  doc.setTextColor(30, 30, 30);
  doc.text("Certificate of Completion", w / 2, 190, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("This is to certify that", w / 2, 230, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...GREEN);
  doc.text(data.employeeName, w / 2, 268, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("has successfully completed the course", w / 2, 300, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(data.courseName, w / 2, 330, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Completed on ${data.completionDate}`, w / 2, 356, { align: "center" });

  // Authorised signature
  doc.setDrawColor(120, 120, 120);
  doc.line(90, h - 100, 270, h - 100);
  doc.setFontSize(10);
  doc.text("Authorised Signature", 180, h - 84, { align: "center" });

  // Certificate number
  doc.setFontSize(10);
  doc.text(`Certificate No. ${data.certificateNumber}`, 90, h - 60);

  // QR verification placeholder
  try {
    const qr = await QRCode.toDataURL(`peohub:certificate:${data.certificateNumber}`, {
      margin: 0,
      width: 200,
    });
    doc.addImage(qr, "PNG", w - 160, h - 165, 80, 80);
    doc.setFontSize(8);
    doc.text("Scan to verify", w - 120, h - 74, { align: "center" });
  } catch {
    /* QR optional */
  }

  return doc;
}

export async function downloadCertificate(data: CertificateData) {
  const doc = await buildCertificatePdf(data);
  doc.save(`certificate-${data.certificateNumber}.pdf`);
}

export async function previewCertificate(data: CertificateData) {
  const doc = await buildCertificatePdf(data);
  const url = doc.output("bloburl");
  window.open(url as unknown as string, "_blank");
}
