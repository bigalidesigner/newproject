// /api/make-pdf.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ham gövdeyi oku (JSON ya da text)
async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Use POST" });
      return;
    }

    const ct = (req.headers["content-type"] || "").toLowerCase();
    let text = "", filename = "text.pdf";

    if (ct.includes("application/json") || ct.includes("text/plain")) {
      const raw = (await readBody(req)) || "";
      if (ct.includes("application/json")) {
        const obj = raw ? JSON.parse(raw) : {};
        text = (obj.text || "").toString();
        const fn = (obj.filename || "").toString().trim();
        if (fn) filename = fn.toLowerCase().endsWith(".pdf") ? fn : `${fn}.pdf`;
      } else {
        text = raw.toString();
      }
    } else {
      // query ile de destek
      text = (req.query.text || "").toString();
    }

    if (!text.trim()) {
      res.status(400).json({ error: "Missing 'text' content" });
      return;
    }

    // --- PDF oluştur ---
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const margin = 50, fontSize = 12;
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
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
        if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) cur = test;
        else {
          if (cur) lines.push(cur);
          if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
            let chunk = "";
            for (const ch of w) {
              const t2 = chunk + ch;
              if (font.widthOfTextAtSize(t2, fontSize) <= maxWidth) chunk = t2;
              else { if (chunk) lines.push(chunk); chunk = ch; }
            }
            cur = chunk;
          } else cur = w;
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", detail: String(err?.message || err) });
  }
}
