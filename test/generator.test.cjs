const assert = require("node:assert/strict");
const {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const generatorModule = import("../scripts/lib/icon-generator.mjs");
const expectedApi = require("./fixtures/public-api.json");
const root = join(__dirname, "..");
const repositoryIcons = join(root, "src", "icons");
const validFixture = join(__dirname, "fixtures", "svg", "valid-minimal.svg");

function withTemporaryIcons(run) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "medical-symbol-generator-"));
  const iconsDirectory = join(temporaryRoot, "icons");
  mkdirSync(iconsDirectory);
  try {
    return run({ temporaryRoot, iconsDirectory });
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

test("icon names preserve the established public naming contract", async () => {
  const { iconNamesFromFilename } = await generatorModule;

  assert.deepEqual(iconNamesFromFilename("ce-bsi.svg"), {
    iconName: "ce-bsi",
    componentName: "CeBsiIcon",
    variableName: "cebsi",
    constantName: "CE_BSI",
  });
});

test("invalid source filenames fail before identifiers are generated", async () => {
  const { iconNamesFromFilename } = await generatorModule;

  for (const filename of [
    "1-leading-number.svg",
    "Uppercase.svg",
    "two--hyphens.svg",
    "path/name.svg",
    "space name.svg",
    "not-an-svg.txt",
  ]) {
    assert.throws(() => iconNamesFromFilename(filename), /filename|identifier/i);
  }
});

test("generation is byte deterministic and independent of localeCompare", async () => {
  const { generateIndex } = await generatorModule;
  const originalLocaleCompare = String.prototype.localeCompare;

  try {
    String.prototype.localeCompare = () => {
      throw new Error("localeCompare must not be used");
    };
    assert.equal(
      generateIndex({ iconsDirectory: repositoryIcons }),
      generateIndex({ iconsDirectory: repositoryIcons }),
    );
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }
});

test("repository generation retains the exact 29-icon public contract", async () => {
  const { generateIndex } = await generatorModule;
  const output = generateIndex({ iconsDirectory: repositoryIcons });
  const components = [...output.matchAll(/^export const (\w+Icon) =/gm)].map(
    ([, name]) => name,
  );
  const iconNames = Object.fromEntries(
    [...output.matchAll(/^  ([A-Z0-9_]+): "([a-z0-9-]+)",$/gm)].map(
      ([, constantName, iconName]) => [constantName, iconName],
    ),
  );

  assert.deepEqual(components, expectedApi.components);
  assert.deepEqual(iconNames, expectedApi.iconNames);
});

test("colliding generated identifiers fail closed", async () => {
  const { generateIndex } = await generatorModule;

  withTemporaryIcons(({ iconsDirectory }) => {
    copyFileSync(validFixture, join(iconsDirectory, "a-b.svg"));
    copyFileSync(validFixture, join(iconsDirectory, "ab.svg"));

    assert.throws(
      () => generateIndex({ iconsDirectory }),
      /collision.*variableName|variableName.*collision/i,
    );
  });
});

test("check mode exits nonzero without rewriting stale generated output", async () => {
  const { writeOrCheckGeneratedIndex } = await generatorModule;

  withTemporaryIcons(({ temporaryRoot, iconsDirectory }) => {
    copyFileSync(validFixture, join(iconsDirectory, "valid-minimal.svg"));
    const outputFile = join(temporaryRoot, "index.tsx");
    writeOrCheckGeneratedIndex({ iconsDirectory, outputFile, check: false });
    const stale = `${readFileSync(outputFile, "utf8")}\n// stale\n`;
    writeFileSync(outputFile, stale);

    const result = spawnSync(
      process.execPath,
      [
        join(root, "scripts", "generate-index.mjs"),
        "--check",
        "--icons-directory",
        iconsDirectory,
        "--output-file",
        outputFile,
      ],
      { encoding: "utf8" },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /out of date/i);
    assert.equal(readFileSync(outputFile, "utf8"), stale);
    assert.deepEqual(readdirSync(temporaryRoot).sort(), ["icons", "index.tsx"]);
  });
});
