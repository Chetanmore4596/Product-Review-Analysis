import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const uploadsDir = path.resolve(__dirname, "../uploads");
const resultsDir = path.resolve(__dirname, "../results");
const pythonScript = path.resolve(__dirname, "../../python-service/scripts/analyze.py");
const venvPython = path.resolve(__dirname, "../../python-service/.venv/Scripts/python.exe");
const pythonExec = fs.existsSync(venvPython) ? venvPython : "python";

for (const dir of [uploadsDir, resultsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "4mb" }));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.get("/api/health", (_, res) => {
  res.json({ status: "ok", service: "product-review-sentiment-api" });
});

app.get("/api/download/:fileName", (req, res) => {
  const safeFileName = path.basename(req.params.fileName || "");
  if (!safeFileName) {
    return res.status(400).json({ error: "Invalid file name." });
  }

  const targetPath = path.join(resultsDir, safeFileName);
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: "Requested file not found." });
  }

  return res.download(targetPath);
});

app.post("/api/analyze", upload.single("dataset"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Use form key 'dataset'." });
  }

  const inputPath = req.file.path;
  const outputPath = path.join(resultsDir, `${path.parse(req.file.filename).name}-analysis.json`);

  try {
    const result = await runPythonAnalysis(inputPath, outputPath);
    if (!result.success) {
      return res.status(500).json({
        error: "Python analysis failed",
        details: result.stderr || "Unknown error"
      });
    }

    const raw = fs.readFileSync(outputPath, "utf-8");
    const analysis = JSON.parse(raw);
    const cleanedCsvFile = analysis?.downloads?.cleaned_csv_file;

    res.json({
      message: "Analysis completed",
      fileName: req.file.originalname,
      analysis,
      download: cleanedCsvFile
        ? {
            cleanedCsvFile,
            cleanedCsvUrl: `/api/download/${encodeURIComponent(cleanedCsvFile)}`
          }
        : null
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

function runPythonAnalysis(inputPath, outputPath) {
  return new Promise((resolve) => {
    const py = spawn(pythonExec, [pythonScript, "--input", inputPath, "--output", outputPath], {
      cwd: path.resolve(__dirname, "../../python-service")
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    py.on("close", (code) => {
      resolve({
        success: code === 0,
        code,
        stdout,
        stderr
      });
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
