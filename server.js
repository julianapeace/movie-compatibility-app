const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { compare } = require("./lib/letterboxd-compare");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function findLetterboxdRoot(extractDir) {
  const hasWatched = (dir) => fs.existsSync(path.join(dir, "watched.csv"));
  if (hasWatched(extractDir)) return extractDir;
  const entries = fs.readdirSync(extractDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  if (dirs.length === 1 && dirs[0].name.startsWith("letterboxd-")) {
    const candidate = path.join(extractDir, dirs[0].name);
    if (hasWatched(candidate)) return candidate;
  }
  for (const d of dirs) {
    const candidate = path.join(extractDir, d.name);
    if (hasWatched(candidate)) return candidate;
  }
  return null;
}

app.use(express.static(path.join(__dirname, "public")));

app.post("/analyze", upload.fields([{ name: "export1", maxCount: 1 }, { name: "export2", maxCount: 1 }]), (req, res) => {
  const file1 = req.files?.export1?.[0];
  const file2 = req.files?.export2?.[0];
  if (!file1 || !file2) {
    return res.status(400).json({ error: "Upload two Letterboxd export zip files (export1 and export2)." });
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "letterboxd-"));
  const dir1 = path.join(tmpDir, "1");
  const dir2 = path.join(tmpDir, "2");
  fs.mkdirSync(dir1, { recursive: true });
  fs.mkdirSync(dir2, { recursive: true });
  try {
    const zip1 = new AdmZip(file1.buffer);
    const zip2 = new AdmZip(file2.buffer);
    zip1.extractAllTo(dir1, true);
    zip2.extractAllTo(dir2, true);
    const root1 = findLetterboxdRoot(dir1);
    const root2 = findLetterboxdRoot(dir2);
    if (!root1) {
      return res.status(400).json({ error: "First zip does not contain a valid Letterboxd export (no watched.csv)." });
    }
    if (!root2) {
      return res.status(400).json({ error: "Second zip does not contain a valid Letterboxd export (no watched.csv)." });
    }
    const { nameA, nameB, watchedBoth, watchlistBoth } = compare(root1, root2);
    res.json({
      nameA,
      nameB,
      watchedBoth: watchedBoth.map((r) => ({ name: r.name, year: r.year, uri: r.uri })),
      watchlistBoth: watchlistBoth.map((r) => ({ name: r.name, year: r.year, uri: r.uri })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Analysis failed." });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Letterboxd compare app at http://localhost:${PORT}`));
