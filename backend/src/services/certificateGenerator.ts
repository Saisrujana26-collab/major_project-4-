import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import { CertificateData } from '../../../shared/types';

export async function generateCertificate(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 Landscape
  const { width, height } = page.getSize();

  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ─── Background ──────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.97, 0.97, 1.0) });

  // Outer border (navy)
  const navyBlue = rgb(0.1, 0.15, 0.4);
  const gold = rgb(0.8, 0.65, 0.1);
  const indigo = rgb(0.25, 0.0, 0.6);

  page.drawRectangle({ x: 15, y: 15, width: width - 30, height: height - 30, borderColor: navyBlue, borderWidth: 4, color: rgb(1, 1, 1, 0) });
  page.drawRectangle({ x: 22, y: 22, width: width - 44, height: height - 44, borderColor: gold, borderWidth: 1.5, color: rgb(1, 1, 1, 0) });

  // ─── Header ──────────────────────────────────────────────────────────────────
  page.drawText('SECUREASSESS', {
    x: 0, y: height - 70, size: 11, font: helveticaBold, color: navyBlue,
    opacity: 0.5,
  });

  // Center align helper
  const drawCentered = (text: string, y: number, size: number, font: typeof timesRomanBold, color = navyBlue) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
  };

  drawCentered('Certificate of Achievement', height - 95, 36, timesRomanBold, navyBlue);

  // Subtitle line
  page.drawRectangle({ x: 100, y: height - 108, width: width - 200, height: 1.5, color: gold });

  drawCentered('This is to certify that', height - 140, 14, timesRoman, rgb(0.3, 0.3, 0.3));

  // Student name
  drawCentered(data.studentName.toUpperCase(), height - 185, 32, timesRomanBold, indigo);

  // Decorative underline
  const nameWidth = timesRomanBold.widthOfTextAtSize(data.studentName.toUpperCase(), 32);
  page.drawRectangle({
    x: (width - nameWidth) / 2, y: height - 192,
    width: nameWidth, height: 2, color: gold,
  });

  drawCentered(`Roll No: ${data.rollNo}`, height - 215, 12, timesRoman, rgb(0.4, 0.4, 0.4));

  drawCentered('has successfully completed the examination', height - 240, 14, timesRoman, rgb(0.3, 0.3, 0.3));

  drawCentered(`"${data.examTitle}"`, height - 270, 18, timesRomanBold, navyBlue);

  // ─── Score Grid ───────────────────────────────────────────────────────────────
  const gridY = height - 330;
  const cols = [100, 240, 380, 530, 660];
  const labels = ['Score', 'Accuracy', 'Level Reached', 'Violations', 'Grade'];
  const values = [
    `${data.score} / ${data.maxScore}`,
    `${data.accuracy}%`,
    data.levelReached.toUpperCase(),
    `${data.violationCount}`,
    data.accuracy >= 80 ? 'A' : data.accuracy >= 60 ? 'B' : data.accuracy >= 40 ? 'C' : 'D',
  ];

  for (let i = 0; i < labels.length; i++) {
    const x = cols[i];
    // Box
    page.drawRectangle({ x, y: gridY - 40, width: 120, height: 55, color: rgb(0.94, 0.94, 1.0), borderColor: navyBlue, borderWidth: 0.5 });
    // Label
    const lw = helvetica.widthOfTextAtSize(labels[i], 9);
    page.drawText(labels[i], { x: x + (120 - lw) / 2, y: gridY - 28, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
    // Value
    const vw = helveticaBold.widthOfTextAtSize(values[i], 14);
    page.drawText(values[i], { x: x + (120 - vw) / 2, y: gridY - 15, size: 14, font: helveticaBold, color: navyBlue });
  }

  // ─── Date & Verification ─────────────────────────────────────────────────────
  const dateStr = new Date(data.completedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  drawCentered(`Issued on ${dateStr}`, gridY - 65, 11, timesRoman, rgb(0.4, 0.4, 0.4));

  // Verification code
  drawCentered(`Verification Code: ${data.verificationCode}`, gridY - 90, 10, helvetica, rgb(0.5, 0.5, 0.5));

  // ─── QR Code ─────────────────────────────────────────────────────────────────
  const qrDataUrl = await QRCode.toDataURL(`SECUREASSESS:${data.verificationCode}:${data.rollNo}`, {
    width: 80, margin: 1,
  });
  const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');
  const qrBytes = Buffer.from(qrBase64, 'base64');
  const qrImage = await pdfDoc.embedPng(qrBytes);
  page.drawImage(qrImage, { x: width - 110, y: 35, width: 75, height: 75 });

  // ─── Footer Seal Text ─────────────────────────────────────────────────────────
  page.drawText('SECUREASSESS CERTIFIED', { x: 40, y: 45, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) });
  page.drawText('Digital Certificate | Anti-Cheat Verified', { x: 40, y: 32, size: 7, font: helvetica, color: rgb(0.7, 0.7, 0.7) });

  // ─── Watermark ───────────────────────────────────────────────────────────────
  page.drawText('SECUREASSESS', {
    x: 180, y: 250, size: 80, font: timesRomanBold,
    color: rgb(0.9, 0.9, 0.95), opacity: 0.15, rotate: degrees(-30),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
