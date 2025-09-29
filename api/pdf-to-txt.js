// /api/pdf-to-txt.js
import formidable from "formidable";
import { readFile } from "fs/promises";
import pdfParse from "pdf-parse";

// Vercel Functions'ta bodyParser yok; raw stream'i formidable ile biz okuyacağız.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  try {
    const { fields, files } = await parseForm(req);

    // Tek dosya veya dizi olabilir
    let f = files?.file;
    if (!f) {
      res.status(400).json({ error: "No file uploaded. Use form-data key 'file'." });
      return;
    }
    if (Array.isArray(f)) f = f[0];

    const filePath = f?.filepath || f?.filepath; // formidable v3 -> filepath
    const mime = (f?.mimetype || "").toLowerCase();
    if (!filePath) {
      res.status(400).json({ error: "Upload failed: no file path." });
      return;
    }
    if (mime && !mime.includes("pdf")) {
      res.status(400).json({ error: "Please upload a PDF file." });
      return;
    }

    const buffer = await readFile(filePath);
    const data = await pdfParse(buffer);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="extracted.txt"');
    res.status(200).send(data.text || "");
  } catch (err) {
    console.error("pdf-to-txt error:", err);
    res.status(500).json({ error: "Failed to extract text" });
  }
}

// ---- helpers ----
function parseForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB (ihtiyaca göre artır)
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
