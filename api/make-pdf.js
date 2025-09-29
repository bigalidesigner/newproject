// Vercel Serverless Function (Node.js)
// URL: /api/make-pdf
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const contentType = req.headers["content-type"] || "";
  let text = "";

  // JSON ya da form-data kabul edelim
  if (contentType.includes("application/json")) {
    const body = req.body || {};
    text = (body.text || "").toString();
  } else {
    // Vercel body-parser form-data’yı otomatik çevirmez; basitçe raw alalım
    // Kolaylık için query param desteği de bırakıyorum: /api/make-pdf?text=...
    text = (req.query.text || "").toString();
  }

  if (!text.trim()) {
    res.status(400).json({ error: "Missing 'text'" });
    return;
  }

  // A4 (pt): 595 x 842
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margin = 50;
  const fontSize = 12;
  let page = pdfDoc.addPage([595.28, 841.89]);
  let { width, height } = page.getSize();
  let y = height - margin;

  // basit kelime-kaydırma
  const maxWidth = width - margin * 2;
  const paragraphs = text.split(/\r?\n/);

  function wrapLine(line) {
    const words = line.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      const wpx = helvetica.widthOfTextAtSize(test, fontSize);
      if (wpx <= maxWidth) cur = test;
      else {
        if (cur) lines.push(cur);
        // çok uzun tek kelime kırılması
        if (helvetica.widthOfTextAtSize(w, fontSize) > maxWidth) {
          let tmp = "";
          for (const ch of w) {
            const t2 = tmp + ch;
            if (helvetica.widthOfTextAtSize(t2, fontSize) <= maxWidth) tmp = t2;
            else {
              if (tmp) lines.push(tmp);
              tmp = ch;
            }
          }
          cur = tmp;
        } else {
          cur = w;
        }
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  const allLines = [];
  for (const p of paragraphs) {
    const wrapped = wrapLine(p);
    if (wrapped.length === 0) allLines.push(" "); // boş satır
    else allLines.push(...wrapped);
  }

  for (const ln of allLines) {
    // yeni sayfa kontrolü
    if (y < margin + fontSize) {
      page = pdfDoc.addPage([595.28, 841.89]);
      ({ width, height } = page.getSize());
      y = height - margin;
    }
    page.drawText(ln, {
      x: margin,
      y,
      size: fontSize,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    y -= fontSize + 4;
  }

  const bytes = await pdfDoc.save();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="text.pdf"');
  res.send(Buffer.from(bytes));
}
