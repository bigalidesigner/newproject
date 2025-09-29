import { getDocument } from "pdfjs-dist";
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

    const pdf = await getDocument({ data: new Uint8Array(buf) }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(it => it.str).join(" ") + "\n";
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="extracted.txt"');
    res.status(200).send(fullText.trim());
  } catch (err) {
    console.error("pdf-to-txt error:", err);
    res.status(500).json({ error: "Failed to extract text", detail: String(err.message || err) });
  }
}
