// /api/pdf-to-txt.js
import pdfParse from "pdf-parse";

export const config = { api: { bodyParser: false } };

// RAW gövdeyi oku
function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  console.log("[pdf-to-txt] method:", req.method, "content-type:", ct);

  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  try {
    if (!ct.startsWith("application/pdf") && !ct.startsWith("application/octet-stream")) {
      console.error("[pdf-to-txt] Unsupported content-type:", ct);
      res.status(400).json({ error: "Send raw PDF with Content-Type: application/pdf" });
      return;
    }

    const buf = await readRaw(req);
    console.log("[pdf-to-txt] raw bytes:", buf?.length || 0);

    if (!buf || buf.length === 0) {
      res.status(400).json({ error: "Empty file" });
      return;
    }
    if (buf.length > 4.5 * 1024 * 1024) {
      // Vercel serverless istek gövdesi sınırlı; büyük dosyada hata olmasın diye uyar.
      res.status(413).json({ error: "File too large for this endpoint (try <= 4MB)" });
      return;
    }

    const result = await pdfParse(buf);
    const text = result?.text || "";

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="extracted.txt"');
    res.status(200).send(text);
  } catch (err) {
    console.error("[pdf-to-txt] ERROR:", err);
    res.status(500).json({ error: "Failed to extract text", detail: String(err?.message || err) });
  }
}
