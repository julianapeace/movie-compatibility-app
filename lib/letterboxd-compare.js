const fs = require("fs");
const path = require("path");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || (c === "\n" && !inQuotes)) {
      const s = cur.trim().replace(/^"|"$/g, "");
      out.push(s);
      cur = "";
      if (c === "\n") break;
    } else {
      cur += c;
    }
  }
  if (cur.length) out.push(cur.trim().replace(/^"|"$/g, ""));
  return out;
}

function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.trim().split(/\r?\n/).filter((l) => l);
  if (lines.length < 2) return [];
  const rows = lines.slice(1).map((line) => {
    const parts = parseCsvLine(line);
    if (parts.length < 4) return null;
    const date = parts[0];
    const year = parts[parts.length - 2];
    const uri = parts[parts.length - 1];
    const name = parts.slice(1, parts.length - 2).join(",");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}$/.test(year) || !uri.startsWith("https://")) return null;
    return { date, name, year, uri };
  });
  return rows.filter(Boolean);
}

function byUri(set) {
  return new Map(set.map((r) => [r.uri, r]));
}

function intersectMaps(a, b) {
  const result = [];
  for (const [uri, row] of a) {
    if (b.has(uri)) result.push(row);
  }
  return result;
}

function folderDisplayName(folderPath) {
  return path.basename(folderPath).replace(/^letterboxd-/, "").replace(/-/g, " ");
}

function compare(folderA, folderB) {
  const nameA = folderDisplayName(folderA);
  const nameB = folderDisplayName(folderB);
  const watchedA = parseCsv(path.join(folderA, "watched.csv"));
  const watchedB = parseCsv(path.join(folderB, "watched.csv"));
  const watchlistA = parseCsv(path.join(folderA, "watchlist.csv"));
  const watchlistB = parseCsv(path.join(folderB, "watchlist.csv"));
  const watchedBoth = intersectMaps(byUri(watchedA), byUri(watchedB));
  const watchlistBoth = intersectMaps(byUri(watchlistA), byUri(watchlistB));
  return { nameA, nameB, watchedBoth, watchlistBoth };
}

module.exports = { compare, parseCsv, folderDisplayName };
