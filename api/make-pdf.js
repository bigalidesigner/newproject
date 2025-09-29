import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const ct = req.headers["content-type"] || "";
  let text = "", filename = "text.pdf";

  if (ct.includes("application/json")) {
    const body = req.body || {};
    text = (body.text || "").toString();
    const raw = (body.filename || "").toString().trim();
    if (raw) {
      // .pdf uzantısı yoksa ekle
      filename = raw.toLowerCase().endsWith(".pdf") ? raw : `${raw}.pdf`;
    }
  } else {
    text = (req.query.text || "").toString();
  }

  if (!text.trim()) {
    res.status(400).json({ error: "Missing 'text'" });
    return;
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const margin = 50, fontSize = 12;
  let page = pdfDoc.addPage([595.28, 841.89]);
  let { width, height } = page.getSize();
  let y = height - margin;
  const maxWidth = width - margin * 2;

  const paragraphs = text.split(/\r?\n/);
  const wrap = (line) => {
    const words = line.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        cur = test;
      } else {
        if (cur) lines.push(cur);
        if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
          let chunk = "";
          for (const ch of w) {
            const t2 = chunk + ch;
            if (font.widthOfTextAtSize(t2, fontSize) <= maxWidth) chunk = t2;
            else { if (chunk) lines.push(chunk); chunk = ch; }
          }
          cur = chunk;
        } else {
          cur = w;
        }
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [" "];
  };

  for (const p of paragraphs) {
    for (const line of wrap(p)) {
      if (y < margin + fontSize) {
        page = pdfDoc.addPage([595.28, 841.89]);
        ({ width, height } = page.getSize());
        y = height - margin;
      }
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0,0,0) });
      y -= fontSize + 4;
    }
  }

  const bytes = await pdfDoc.save();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(bytes));
}
