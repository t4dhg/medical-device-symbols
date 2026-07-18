#!/usr/bin/env node

// Generates the "Available Icons" gallery table for the README.
// Images are referenced through the jsDelivr CDN with absolute URLs so they
// render on npmjs.com as well as on GitHub (relative paths and raw src/ files
// are not shipped to npm and do not resolve there).

const fs = require("fs");
const path = require("path");

const REPO = "t4dhg/medical-device-symbols";
const BRANCH = "master";
const CDN = `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/src/icons`;

// Readable titles for symbols whose auto-derived title would be an acronym or
// grammatically awkward. Everything else falls back to Title Case of the file name.
const TITLE_OVERRIDES = {
  ce: "CE marking",
  "ce-bsi": "CE marking (Notified Body 2797)",
  md: "Medical device",
  udi: "Unique Device Identifier",
  "do-not-re-use": "Do not reuse",
  "in-vitro-diagnostic-medical-device": "In vitro diagnostic medical device",
};

const iconsDir = path.join(__dirname, "../src/icons");
const svgFiles = fs
  .readdirSync(iconsDir)
  .filter((file) => file.endsWith(".svg"))
  .sort();

function toComponentName(iconName) {
  const pascal =
    iconName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("") + "Icon";
  return /^\d/.test(pascal) ? "Icon" + pascal : pascal;
}

function toTitle(iconName) {
  if (TITLE_OVERRIDES[iconName]) return TITLE_OVERRIDES[iconName];
  return iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const lines = [];
lines.push("| Symbol | Component | Title |");
lines.push("| :----: | --------- | ----- |");

svgFiles.forEach((file) => {
  const iconName = path.basename(file, ".svg");
  const component = toComponentName(iconName);
  const title = toTitle(iconName);
  const img = `<img src="${CDN}/${file}" width="44" height="44" alt="${title}" />`;
  lines.push(`| ${img} | \`${component}\` | ${title} |`);
});

process.stdout.write(lines.join("\n") + "\n");
