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
    email = "",
    title = "QUOTE",
    subtitle = "",
    subtitle2 = "",
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

  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(title, 105, y, { align: "center" });

  y += 10;

  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(`Quote #: ${quoteNumber}`, 14, y);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, y + 6);

  y += 18;

  doc.text(`Company: ${company}`, 14, y);
  doc.text(`Attn: ${attn}`, 14, y + 6);
  doc.text(`Email: ${email}`, 14, y + 12);

  y += 24;

  if (subtitle) {
    doc.setFont(undefined, "bold");
    doc.text(subtitle, 14, y);
    y += 7;
  }

  if (subtitle2) {
    doc.setFont(undefined, "normal");

    if (Array.isArray(subtitle2)) {
      subtitle2.forEach((line, index) => {
        doc.text(line, 14, y + index * 6);
      });
      y += subtitle2.length * 6;
    } else {
      doc.text(subtitle2, 14, y);
      y += 6;
    }

    y += 5;
  }

  return y;
};