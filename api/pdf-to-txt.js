import pdfParse from "pdf-parse";

export const config = { api: { bodyParser: false } };

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
    const buf = await readRaw(req);
    if (!buf || buf.length === 0) {
      res.status(400).json({ error: "Empty file" });
      return;
    }

    // pdf-parse doğrudan Buffer alabilir
    const data = await pdfParse(buf);
    const text = (data && data.text) ? data.text.trim() : "";

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="extracted.txt"');
    res.status(200).send(text);
  } catch (err) {
    console.error("pdf-to-txt error:", err);
    res.status(500).json({ error: "Failed to extract text", detail: String(err?.message || err) });
  }
}
