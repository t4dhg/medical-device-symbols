const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const safePackageDescription =
  "React components for ISO 15223-1 symbols and separate regulatory marks. TypeScript, currentColor theming, and zero runtime dependencies.";
const safeThemingEntry =
  "- **Theming**: all 29 symbols now inherit `currentColor` instead of hardcoded black. Use the `color` prop or CSS `color` to recolor them; a plain `fill` prop does not recolor artwork paths that use `currentColor`.";

function validatePackageDescription(description) {
  assert.equal(description, safePackageDescription);
}

function validateChangelogTheming(changelog) {
  const versionSection = changelog.match(
    /^## \[2\.2\.0\][\s\S]*?(?=^## \[|$(?![\s\S]))/m,
  );

  assert.ok(versionSection);
  assert.equal(versionSection[0].split(safeThemingEntry).length - 1, 1);
  assert.doesNotMatch(changelog.replace(safeThemingEntry, ""), /\bfill\b/i);
}

function validateRecoloringGuidance(guidance) {
  const normalized = guidance.replaceAll("`", "");
  assert.doesNotMatch(
    normalized,
    /\b(?:color\s+(?:and|or)\s+fill|fill\s+(?:and|or)\s+color)\b.{0,100}\b(?:work|recolor|consistent)/is,
  );
  assert.doesNotMatch(
    normalized,
    /\bfill\b.{0,60}\b(?:recolors every|recolors all|supported recoloring)/is,
  );
}

function repositoryDocuments() {
  const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");
  return {
    readme: read("README.md"),
    contributing: read("CONTRIBUTING.md"),
    changelog: read("CHANGELOG.md"),
    demo: read("examples/demo.html"),
    extraction: read("examples/node-svg-extraction.js"),
    reactExamples: [
      read("examples/react/ComprehensiveDemo.tsx"),
      read("examples/react/MedicalDeviceLabel.tsx"),
      read("examples/react/NewIconDemo.tsx"),
      read("examples/react/UsageExample.tsx"),
      read("examples/react/ComprehensiveDemo.css"),
      read("examples/react/MedicalDeviceLabel.css"),
    ].join("\n"),
    examplesPackage: JSON.parse(read("examples/package.json")),
    rootPackage: JSON.parse(read("package.json")),
  };
}

function validateDocumentation(documents) {
  const {
    readme,
    contributing,
    changelog,
    demo,
    extraction,
    reactExamples,
    examplesPackage,
    rootPackage,
  } = documents;
  const publicExamples = [readme, demo, extraction, reactExamples].join("\n");
  const publicGuidance = [
    publicExamples,
    changelog,
    rootPackage.description,
  ].join("\n");

  validatePackageDescription(rootPackage.description);
  assert.match(readme, /ISO 15223-1 symbols and separate regulatory marks/i);
  assert.match(readme, /BSI 2797.*only when.*applicable/is);
  assert.match(readme, /artwork.*not.*regulatory determination/is);
  assert.match(readme, /decorative.*aria-hidden/is);
  assert.match(readme, /labeled.*title/is);
  assert.match(readme, /<CautionIcon aria-hidden="true" \/>/);
  assert.match(readme, /<CautionIcon title="Caution" role="img" \/>/);
  assert.doesNotMatch(
    publicExamples,
    /(?:\bfill\s*=\s*["'{](?:red|#[0-9a-f]{3,8})|\bfill\s*:\s*(?:red|#[0-9a-f]{3,8}))/i,
  );
  assert.match(publicExamples, /(?:\bcolor\s*=|\bcolor\s*:)/i);
  assert.doesNotMatch(publicExamples, /\bCE\s+0123\b/);
  validateRecoloringGuidance(publicGuidance);
  validateChangelogTheming(changelog);

  assert.match(changelog, /^## \[Unreleased\]/m);
  assert.doesNotMatch(changelog, /^## \[2\.0\.[23]\]/m);
  assert.doesNotMatch(
    changelog,
    /2\.3(?:\.0)?.{0,60}\b(?:published|tagged|released)\b/is,
  );
  assert.match(contributing, /npm run verify/);
  assert.doesNotMatch(contributing, /smoke tests/i);
  assert.doesNotMatch(contributing, /generate-(?:index|table)\.js/);

  assert.equal(examplesPackage.private, true);
  assert.equal(examplesPackage.dependencies, undefined);
  assert.equal(
    examplesPackage.devDependencies["medical-device-symbols"],
    "file:..",
  );
  assert.equal(examplesPackage.devDependencies.react, "19.2.8");
  assert.equal(examplesPackage.devDependencies["react-dom"], "19.2.8");
  assert.equal(examplesPackage.devDependencies["@types/react"], "19.2.18");
  assert.equal(examplesPackage.devDependencies["@types/react-dom"], "19.2.5");
  assert.equal(examplesPackage.devDependencies.typescript, "5.9.3");
  assert.equal(existsSync(join(root, "examples", "package-lock.json")), false);
  assert.doesNotMatch(extraction, /require\(["']\.\.\/lib\//);
  assert.equal(existsSync(join(root, "scripts", "generate-table.js")), false);
  assert.equal(existsSync(join(root, "scripts", "generate-table.mjs")), true);
  assert.equal(
    rootPackage.scripts["gallery:update"],
    "node scripts/generate-table.mjs",
  );
  assert.equal(
    rootPackage.scripts["gallery:check"],
    "node scripts/generate-table.mjs --check",
  );
  assert.match(rootPackage.scripts.verify, /npm run gallery:check/);
  assert.match(rootPackage.scripts.verify, /npm run build/);
  assert.match(rootPackage.scripts.verify, /npm run test/);
}

test("public guidance matches the tested component and maintenance behavior", () => {
  validateDocumentation(repositoryDocuments());
});

test("package metadata distinguishes symbols from regulatory marks", () => {
  const { rootPackage } = repositoryDocuments();
  validatePackageDescription(rootPackage.description);
});

test("changelog guidance does not claim fill recolors currentColor artwork", () => {
  const { changelog } = repositoryDocuments();
  validateRecoloringGuidance(changelog);
  validateChangelogTheming(changelog);
});

test("the documentation validator rejects an omitted BSI applicability warning", () => {
  const documents = repositoryDocuments();
  documents.readme = documents.readme.replace(
    "Use it only when the relevant conformity-assessment facts make BSI 2797 applicable to that device.",
    "It may be used for any device.",
  );
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator rejects conflated compliance metadata", () => {
  const documents = repositoryDocuments();
  documents.rootPackage.description =
    "React components for ISO 15223-1 symbols for EU MDR, FDA, and global labeling compliance.";
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator rejects a package requirements guarantee without compliance wording", () => {
  const documents = repositoryDocuments();
  documents.rootPackage.description = `${safePackageDescription} Guaranteed to meet EU MDR and FDA labeling requirements.`;
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator rejects package metadata that conflates symbols and regulatory requirements", () => {
  const documents = repositoryDocuments();
  documents.rootPackage.description =
    "React components for ISO 15223-1 symbols and separate regulatory marks under EU MDR and FDA labeling requirements. TypeScript, currentColor theming, and zero runtime dependencies.";
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator rejects fill-based recoloring guidance", () => {
  const documents = repositoryDocuments();
  documents.demo = documents.demo.replace(/color=/i, "fill=");
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator rejects misleading changelog fill guidance", () => {
  const documents = repositoryDocuments();
  documents.changelog = documents.changelog.replace(
    "### Fixed",
    "### Fixed\n\n- The fill prop is a supported recoloring mechanism for every icon.",
  );
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator rejects changelog guidance that uses fill or color to theme every icon", () => {
  const documents = repositoryDocuments();
  documents.changelog = documents.changelog.replace(
    safeThemingEntry,
    "- **Theming**: all 29 symbols now inherit `currentColor` instead of hardcoded black. Use either `fill` or `color` to theme every icon.",
  );
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator rejects extra positive fill theming guidance", () => {
  const documents = repositoryDocuments();
  documents.changelog = documents.changelog.replace(
    safeThemingEntry,
    `${safeThemingEntry}\n- The \`fill\` prop can theme every icon just like \`color\`.`,
  );
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator rejects a false publication boundary", () => {
  const documents = repositoryDocuments();
  documents.changelog = documents.changelog.replace(
    "## [Unreleased]",
    "## [2.3.0] - 2026-08-27\n\nVersion 2.3.0 is published and tagged.",
  );
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});
