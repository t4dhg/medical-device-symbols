const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = join(__dirname, "..");
const safePackageDescription =
  "React components for ISO 15223-1 symbols and separate regulatory marks. TypeScript, currentColor theming, and zero runtime dependencies.";
const safeThemingEntry =
  "- **Theming**: all 29 symbols now inherit `currentColor` instead of hardcoded black. Use the `color` prop or CSS `color` to recolor them; a plain `fill` prop does not recolor artwork paths that use `currentColor`.";
const safeVersion22PackagingEntry =
  "- **Dual ESM + CommonJS build** with an `exports` map and `sideEffects: false` metadata.";
const safeVersion23TreeShakingEntry =
  "- Added generated `/* @__PURE__ */` annotations and verified that ordinary bundlers omit unused icon exports.";

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

function changelogSection(changelog, heading) {
  const start = changelog.indexOf(heading);
  assert.notEqual(start, -1, `${heading} is missing`);
  const next = changelog.indexOf("\n## ", start + heading.length);
  return changelog.slice(start, next === -1 ? undefined : next);
}

function validateChangelogPackaging(changelog) {
  const version22 = changelogSection(changelog, "## [2.2.0]");
  const version23 = changelogSection(
    changelog,
    "## 2.3.0 - Unreleased (release candidate)",
  );
  assert.equal(version22.split(safeVersion22PackagingEntry).length - 1, 1);
  assert.doesNotMatch(
    version22,
    /genuinely tree-shakeable|ordinary bundler.*omit|pure annotations/i,
  );
  assert.equal(version23.split(safeVersion23TreeShakingEntry).length - 1, 1);
}

function tagName(node) {
  return node.tagName.getText();
}

function attributes(node) {
  return node.attributes.properties.filter(ts.isJsxAttribute);
}

function attribute(node, name) {
  return attributes(node).find((candidate) => candidate.name.text === name);
}

function literalAttribute(node, name) {
  const value = attribute(node, name)?.initializer;
  return value && ts.isStringLiteral(value) ? value.text : undefined;
}

function jsxText(node) {
  const parts = [];
  const visit = (candidate) => {
    if (ts.isJsxText(candidate)) parts.push(candidate.text);
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return parts.join(" ").replace(/\s+/gu, " ").trim();
}

function descendantIcons(node) {
  const result = [];
  const visit = (candidate) => {
    if (
      (ts.isJsxElement(candidate) || ts.isJsxSelfClosingElement(candidate)) &&
      tagName(
        ts.isJsxElement(candidate) ? candidate.openingElement : candidate,
      ).endsWith("Icon")
    ) {
      result.push(
        ts.isJsxElement(candidate) ? candidate.openingElement : candidate,
      );
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return result;
}

function jsxElements(sourceFile, expectedTag, expectedClass) {
  const result = [];
  const visit = (node) => {
    if (
      ts.isJsxElement(node) &&
      tagName(node.openingElement) === expectedTag &&
      (expectedClass === undefined ||
        literalAttribute(node.openingElement, "className") === expectedClass)
    ) {
      result.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

function parseReactExample(filename, source) {
  const parsed = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  assert.deepEqual(
    parsed.parseDiagnostics,
    [],
    `${filename} must parse as TSX`,
  );
  return parsed;
}

function validateReactExampleSemantics(reactExampleFiles) {
  const expectedInteractiveButtons = {
    "ComprehensiveDemo.tsx": 2,
    "UsageExample.tsx": 1,
  };
  for (const [filename, source] of Object.entries(reactExampleFiles)) {
    const parsed = parseReactExample(filename, source);
    let interactiveButtons = 0;
    const visit = (node) => {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : undefined;
      if (opening && tagName(opening).endsWith("Icon")) {
        assert.equal(
          attribute(opening, "onClick"),
          undefined,
          `${filename}: icon components must not be interactive controls`,
        );
      }
      if (ts.isJsxElement(node) && tagName(node.openingElement) === "button") {
        const icons = descendantIcons(node);
        if (icons.length > 0) {
          interactiveButtons += 1;
          assert.equal(literalAttribute(node.openingElement, "type"), "button");
          const accessibleName =
            literalAttribute(node.openingElement, "aria-label") ||
            jsxText(node);
          assert.ok(
            accessibleName.trim(),
            `${filename}: icon button needs a name`,
          );
          for (const icon of icons) {
            assert.equal(literalAttribute(icon, "aria-hidden"), "true");
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
    assert.equal(
      interactiveButtons,
      expectedInteractiveButtons[filename] ?? 0,
      `${filename}: interactive behavior must use native icon buttons`,
    );

    if (filename === "ComprehensiveDemo.tsx") {
      const labelItems = jsxElements(parsed, "div", "label-item");
      const eo = labelItems.find((item) =>
        jsxText(item).toLowerCase().includes("ethylene oxide"),
      );
      assert.ok(eo, "the EO sterilization example is missing");
      assert.equal(jsxText(eo), "Sterilized using ethylene oxide");
      assert.deepEqual(descendantIcons(eo).map(tagName), [
        "SterilizedUsingEthyleneOxideIcon",
      ]);

      const specialized = jsxElements(parsed, "div", "spec-item");
      const nonPyrogenic = specialized.find((item) =>
        descendantIcons(item).some(
          (icon) => tagName(icon) === "NonPyrogenicIcon",
        ),
      );
      assert.ok(nonPyrogenic, "the non-pyrogenic example is missing");
      const descriptions = jsxElements(nonPyrogenic, "p").map(jsxText);
      assert.deepEqual(descriptions, ["Non-pyrogenic symbol"]);
      assert.doesNotMatch(source, /fever-free|guarantee/i);

      const headings = jsxElements(parsed, "h2").map(jsxText);
      assert.ok(headings.includes("📋 Selected Icons"));
      assert.ok(!headings.includes("📋 All Available Icons"));
    }
  }
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
  const reactExampleFiles = Object.fromEntries(
    [
      "ComprehensiveDemo.tsx",
      "MedicalDeviceLabel.tsx",
      "NewIconDemo.tsx",
      "UsageExample.tsx",
    ].map((filename) => [filename, read(join("examples", "react", filename))]),
  );
  return {
    readme: read("README.md"),
    contributing: read("CONTRIBUTING.md"),
    changelog: read("CHANGELOG.md"),
    demo: read("examples/demo.html"),
    extraction: read("examples/node-svg-extraction.js"),
    reactExampleFiles,
    reactExamples: [
      ...Object.values(reactExampleFiles),
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
    reactExampleFiles,
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
  validateChangelogPackaging(changelog);
  validateReactExampleSemantics(reactExampleFiles);

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

test("changelog attributes packaging metadata to 2.2 and verified tree shaking to 2.3", () => {
  const { changelog } = repositoryDocuments();
  validateChangelogPackaging(changelog);
});

test("React examples use exact symbol wording and native accessible controls", () => {
  const { reactExampleFiles } = repositoryDocuments();
  validateReactExampleSemantics(reactExampleFiles);
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

test("the documentation validator rejects the former 2.2 tree-shaking overclaim", () => {
  const documents = repositoryDocuments();
  documents.changelog = documents.changelog.replace(
    safeVersion22PackagingEntry,
    "- **Dual ESM + CommonJS build** with an `exports` map and `sideEffects: false`, so the package is genuinely tree-shakeable.",
  );
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the documentation validator requires 2.3 ordinary-bundler verification", () => {
  const documents = repositoryDocuments();
  documents.changelog = documents.changelog.replace(
    safeVersion23TreeShakingEntry,
    "- Added generated annotations for icon exports.",
  );
  assert.throws(() => validateDocumentation(documents), assert.AssertionError);
});

test("the example validator rejects an EO label rendered with the generic sterile icon", () => {
  const { reactExampleFiles } = repositoryDocuments();
  reactExampleFiles["ComprehensiveDemo.tsx"] = reactExampleFiles[
    "ComprehensiveDemo.tsx"
  ].replace(
    /<SterilizedUsingEthyleneOxideIcon[\s\S]*?\/>/u,
    '<SterileIcon className="icon success" size={24} />',
  );
  assert.throws(
    () => validateReactExampleSemantics(reactExampleFiles),
    assert.AssertionError,
  );
});

test("the example validator rejects guarantee wording for the non-pyrogenic symbol", () => {
  const { reactExampleFiles } = repositoryDocuments();
  reactExampleFiles["ComprehensiveDemo.tsx"] = reactExampleFiles[
    "ComprehensiveDemo.tsx"
  ].replace("Non-pyrogenic symbol", "Fever-free guarantee");
  assert.throws(
    () => validateReactExampleSemantics(reactExampleFiles),
    assert.AssertionError,
  );
});

test("the example validator rejects event handlers on bare icon components", () => {
  const { reactExampleFiles } = repositoryDocuments();
  reactExampleFiles["UsageExample.tsx"] = reactExampleFiles[
    "UsageExample.tsx"
  ].replace(
    '<CeIcon size={40} aria-hidden="true" />',
    '<CeIcon size={40} aria-hidden="true" onClick={() => {}} />',
  );
  assert.throws(
    () => validateReactExampleSemantics(reactExampleFiles),
    assert.AssertionError,
  );
});

test("the example validator rejects inaccessible icon-button mutations", () => {
  const pristine = repositoryDocuments().reactExampleFiles;
  for (const [name, before, after] of [
    ["wrong button type", 'type="button"', 'type="submit"'],
    ["missing accessible name", ' aria-label="Log the CE icon selection"', ""],
    ["non-decorative icon", 'aria-hidden="true"', 'aria-hidden="false"'],
  ]) {
    const candidate = structuredClone(pristine);
    candidate["UsageExample.tsx"] = candidate["UsageExample.tsx"].replace(
      before,
      after,
    );
    assert.throws(
      () => validateReactExampleSemantics(candidate),
      assert.AssertionError,
      name,
    );
  }
});

test("the example validator rejects an all-icons heading over a selected subset", () => {
  const { reactExampleFiles } = repositoryDocuments();
  reactExampleFiles["ComprehensiveDemo.tsx"] = reactExampleFiles[
    "ComprehensiveDemo.tsx"
  ].replace("📋 Selected Icons", "📋 All Available Icons");
  assert.throws(
    () => validateReactExampleSemantics(reactExampleFiles),
    assert.AssertionError,
  );
});
