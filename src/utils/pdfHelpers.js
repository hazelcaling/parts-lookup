

import leftLogo from "../assets/leftLogo.jpeg";
import rightLogo from "../assets/rightLogo.png";

export const generateQuoteNumber = () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const random = Math.floor(Math.random() * 90) + 10;
  return `Q${mm}${dd}${yy}${random}`;
};

export const money = (value) =>
  `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const drawQuoteHeader = (
  doc,
  {
    quoteNumber,
    company = "",
    attn = "",
    model = "",
    serial = "",
    job = "",
    title = "QUOTE",
  }
) => {
  const leftLogoX = 14;
  const leftLogoY = 10;
  const leftLogoW = 60;
  const leftLogoH = 30;

  const rightLogoX = 110;
  const rightLogoY = 15;
  const rightLogoW = 90;
  const rightLogoH = 30;

  try {
    doc.addImage(leftLogo, "JPEG", leftLogoX, leftLogoY, leftLogoW, leftLogoH);
  } catch (e) {}

  try {
    doc.addImage(rightLogo, "PNG", rightLogoX, rightLogoY, rightLogoW, rightLogoH);
  } catch (e) {
    console.error("Right logo failed to load", e);
  }

  const logosBottom = Math.max(leftLogoY + leftLogoH, rightLogoY + rightLogoH);
  let y = logosBottom + 10;

  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(title, 105, y, { align: "center" });

  y += 12;

  // Quote # (bold) + Date
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text(`Quote #: ${quoteNumber}`, 14, y);

  doc.setFont(undefined, "normal");
doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, y, { align: "right" });

  y += 10;

  // Company & Attn
if (company && company.trim()) {
  doc.text(company.trim(), 14, y);
  y += 6;
}
if (attn && attn.trim()) {
  doc.text(`Attn: ${attn.trim()}`, 14, y);
  y += 6;
}

  // Model & Serial (only if filled)
  if (model && model.trim()) {
    doc.text(`Model: ${model.trim()}`, 14, y);
    y += 6;
  }
  if (serial && serial.trim()) {
    doc.text(`Serial: ${serial.trim()}`, 14, y);
    y += 6;
  }
  if (job && job.trim()) {
    doc.text(`Job: ${job.trim()}`, 14, y);
    y += 6;
  }

  return y + 4;
};