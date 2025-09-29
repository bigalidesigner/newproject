// /api/pdf-to-txt.js
import pdfParse from "pdf-parse";

// VERCEL'DE GEREKLİ: bodyParser'ı kapat
export const config = {
  api: { bodyParser: false }
};

// ham (raw) gövdeyi oku
function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  try {
    const ct = (req.headers["content-type"] || "").toLowerCase();
    if (!ct.startsWith("application/pdf") && !ct.startsWith("application/octet-stream")) {
      res.status(400).json({ error: "Send raw PDF body with Content-Type: application/pdf" });
      return;
    }

    // RAW PDF gövdesini oku
    const buffer = await readRaw(req);
    if (!buffer || buffer.length === 0) {
      res.status(400).json({ error: "Empty file" });
      return;
    }
    // Not: Vercel Serverless istek gövdesi ~4–5MB sınırında. Küçük PDF ile test et.

    const result = await pdfParse(buffer);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="extracted.txt"');
    res.status(200).send(result.text || "");
  } catch (err) {
    console.error("pdf-to-txt error:", err);
    res.status(500).json({ error: "Failed to extract text" });
  }
}
