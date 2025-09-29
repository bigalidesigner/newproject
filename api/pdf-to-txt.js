// /api/pdf-to-txt.js
import formidable from "formidable";
import { readFile } from "fs/promises";
import pdfParse from "pdf-parse";

// ham gövdeyi oku
function readRaw(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function parseMultipart(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024 // 25MB
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  try {
    const ct = (req.headers["content-type"] || "").toLowerCase();

    let buffer;

    if (ct.startsWith("application/pdf") || ct.startsWith("application/octet-stream")) {
      // RAW: body doğrudan PDF
      buffer = await readRaw(req);
    } else if (ct.includes("multipart/form-data")) {
      // Multipart: form-data 'file'
      const { files } = await parseMultipart(req);
      let f = files?.file;
      if (Array.isArray(f)) f = f[0];
      if (!f?.filepath) {
        res.status(400).json({ error: "No file uploaded. Use form-data key 'file'." });
        return;
      }
      buffer = await readFile(f.filepath);
    } else {
      res.status(400).json({ error: "Unsupported content-type" });
      return;
    }

    if (!buffer || buffer.length === 0) {
      res.status(400).json({ error: "Empty file" });
      return;
    }

    const result = await pdfParse(buffer);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="extracted.txt"');
    res.status(200).send(result.text || "");
  } catch (err) {
    console.error("pdf-to-txt error:", err);
    res.status(500).json({ error: "Failed to extract text" });
  }
}
