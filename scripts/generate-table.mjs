#!/usr/bin/env node

import {
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY = "t4dhg/medical-device-symbols";
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptsDirectory, "..");
const TITLE_OVERRIDES = {
  ce: "CE marking",
  "ce-bsi": "CE marking (Notified Body 2797)",
  md: "Medical device",
  udi: "Unique Device Identifier",
  "do-not-re-use": "Do not reuse",
  "in-vitro-diagnostic-medical-device": "In vitro diagnostic medical device",
};

function toComponentName(iconName) {
  const pascal = `${iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")}Icon`;
  return /^\d/.test(pascal) ? `Icon${pascal}` : pascal;
}

function toTitle(iconName) {
  return (
    TITLE_OVERRIDES[iconName] ??
    iconName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export function renderGallery({ iconsDirectory, packageVersion }) {
  const cdn = `https://cdn.jsdelivr.net/gh/${REPOSITORY}@v${packageVersion}/src/icons`;
  const svgFiles = readdirSync(iconsDirectory)
    .filter((file) => file.endsWith(".svg"))
    .sort();
  const lines = [
    "<!-- prettier-ignore -->",
    "| Symbol | Component | Title |",
    "| :----: | --------- | ----- |",
  ];

  for (const file of svgFiles) {
    const iconName = basename(file, ".svg");
    const component = toComponentName(iconName);
    const title = toTitle(iconName);
    const image = `<img src="${cdn}/${file}" width="44" height="44" alt="${title}" />`;
    lines.push(`| ${image} | \`${component}\` | ${title} |`);
  }

  return `${lines.join("\n")}\n`;
}

export function replaceGallery(readme, gallery) {
  const startMarker = "## Available Icons\n";
  const endMarker = "\n## Usage\n";
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker, start + startMarker.length);

  if (
    start === -1 ||
    end === -1 ||
    readme.indexOf(startMarker, start + 1) !== -1
  ) {
    throw new Error(
      "README must contain one Available Icons section before Usage",
    );
  }

  const section = `${startMarker}\n29 symbols, each exported as a \`PascalCase\` component.\n\n${gallery}`;
  return `${readme.slice(0, start)}${section}${readme.slice(end)}`;
}

export function writeOrCheckGallery({
  iconsDirectory,
  readmeFile,
  packageVersion,
  check,
}) {
  const current = readFileSync(readmeFile, "utf8");
  const expected = replaceGallery(
    current,
    renderGallery({ iconsDirectory, packageVersion }),
  );

  if (current === expected) return false;
  if (check)
    throw new Error(
      "README gallery is out of date; run npm run gallery:update",
    );

  const temporaryFile = join(
    dirname(readmeFile),
    `.${basename(readmeFile)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    writeFileSync(temporaryFile, expected, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o644,
    });
    renameSync(temporaryFile, readmeFile);
  } finally {
    rmSync(temporaryFile, { force: true });
  }
  return true;
}

function main(args) {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
    throw new Error("Usage: node scripts/generate-table.mjs [--check]");
  }
  const packageVersion = JSON.parse(
    readFileSync(join(repositoryRoot, "package.json"), "utf8"),
  ).version;
  writeOrCheckGallery({
    iconsDirectory: join(repositoryRoot, "src", "icons"),
    readmeFile: join(repositoryRoot, "README.md"),
    packageVersion,
    check: args[0] === "--check",
  });
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
