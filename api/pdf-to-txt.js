// /api/pdf-to-txt.js
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

// Vercel config: bodyParser kapat
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  // formidable ile dosyayı al
  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err || !files.file) {
      res.status(400).json({ error: "No PDF uploaded" });
      return;
    }
    try {
      const filePath = files.file[0].filepath;
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="extracted.txt"'
      );
      res.send(pdfData.text || "");
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to extract text" });
    }
  });
}
