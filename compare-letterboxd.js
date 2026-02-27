#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const { compare } = require("./lib/letterboxd-compare");

const ROOT = path.resolve(__dirname);

function findLetterboxdFolders() {
  const names = fs.readdirSync(ROOT);
  return names
    .filter((n) => n.startsWith("letterboxd-") && fs.statSync(path.join(ROOT, n)).isDirectory())
    .map((n) => path.join(ROOT, n));
}

function run() {
  const folders = findLetterboxdFolders();
  if (folders.length < 2) {
    console.error("Need at least two letterboxd-* folders in", ROOT);
    process.exit(1);
  }
  const [folderA, folderB] = folders.slice(0, 2);
  const { nameA, nameB, watchedBoth, watchlistBoth } = compare(folderA, folderB);

  console.log("Letterboxd overlap\n");
  console.log("Folders:", nameA, "|", nameB, "\n");
  console.log("--- Both have seen (watched) ---");
  if (watchedBoth.length === 0) {
    console.log("(none)");
  } else {
    watchedBoth.forEach((r) => console.log(`  ${r.name} (${r.year})  ${r.uri}`));
  }
  console.log("\n--- Both want to see (watchlist) ---");
  if (watchlistBoth.length === 0) {
    console.log("(none)");
  } else {
    watchlistBoth.forEach((r) => console.log(`  ${r.name} (${r.year})  ${r.uri}`));
  }
  console.log("\nCounts: watched in common =", watchedBoth.length, "| watchlist in common =", watchlistBoth.length);
}

run();
