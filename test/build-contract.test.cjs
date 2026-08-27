const assert = require("node:assert/strict");
const {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const typescript = require("typescript");

const expectedApi = require("./fixtures/public-api.json");
const { validatePublicApi } = require("./helpers/public-api-contract.cjs");
const pkg = require("../package.json");

const root = join(__dirname, "..");
const outputs = {
  cjs: join(root, "lib", "index.js"),
  esm: join(root, "lib", "index.mjs"),
  cjsTypes: join(root, "lib", "index.d.ts"),
  esmTypes: join(root, "lib", "index.d.mts"),
};
const declarationSurface = [
  ...expectedApi.components,
  "ICON_NAMES",
  "IconName",
  "IconProps",
  "icons",
].sort();

function declarationExportNames(source, filename) {
  const sourceFile = typescript.createSourceFile(
    filename,
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS,
  );
  assert.equal(sourceFile.parseDiagnostics.length, 0);
  const names = [];

  for (const statement of sourceFile.statements) {
    if (typescript.isExportDeclaration(statement)) {
      if (statement.exportClause === undefined) {
        names.push("*");
      } else if (typescript.isNamedExports(statement.exportClause)) {
        names.push(
          ...statement.exportClause.elements.map(({ name }) => name.text),
        );
      } else {
        names.push(statement.exportClause.name.text);
      }
      continue;
    }
    if (typescript.isExportAssignment(statement)) {
      names.push("default");
      continue;
    }

    const modifiers = typescript.canHaveModifiers(statement)
      ? typescript.getModifiers(statement)
      : undefined;
    if (
      !modifiers?.some(
        ({ kind }) => kind === typescript.SyntaxKind.ExportKeyword,
      )
    ) {
      continue;
    }
    if (
      modifiers.some(
        ({ kind }) => kind === typescript.SyntaxKind.DefaultKeyword,
      )
    ) {
      names.push("default");
      continue;
    }
    if (typescript.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        names.push(
          typescript.isIdentifier(declaration.name)
            ? declaration.name.text
            : "<binding-pattern>",
        );
      }
      continue;
    }
    names.push(statement.name?.text ?? "<anonymous>");
  }

  return names.sort();
}

function validateOutputFileSurface(libDirectory) {
  assert.deepEqual(readdirSync(libDirectory).sort(), [
    "index.d.mts",
    "index.d.ts",
    "index.js",
    "index.mjs",
  ]);
}

function validateDeclarationSurface(source, filename) {
  assert.deepEqual(
    declarationExportNames(source, filename),
    declarationSurface,
  );
}

test("package scripts cannot publish, push, tag, or run on install", () => {
  for (const name of [
    "prepare",
    "postversion",
    "deploy",
    "deploy:patch",
    "deploy:minor",
    "deploy:major",
  ]) {
    assert.equal(pkg.scripts[name], undefined);
  }
});

test("package scripts use only the local direct-tool workflow", () => {
  assert.deepEqual(pkg.scripts, {
    format: "prettier --write .",
    "format:check": "prettier --check .",
    generate: "node scripts/generate-index.mjs",
    "generate:check": "node scripts/generate-index.mjs --check",
    "gallery:update": "node scripts/generate-table.mjs",
    "gallery:check": "node scripts/generate-table.mjs --check",
    clean: "node scripts/build.mjs --clean-only",
    typecheck: "tsc --noEmit",
    build: "npm run generate:check && node scripts/build.mjs",
    "test:unit": "node --test test/*.test.cjs",
    "test:package": "node scripts/test-package.mjs",
    test: "npm run test:unit && npm run test:package",
    "audit:ci": "npm audit --omit=dev --audit-level=high",
    verify:
      "npm run format:check && npm run generate:check && npm run gallery:check && npm run typecheck && npm run build && npm run test && npm run audit:ci",
  });
});

test("package entry points route each module format to matching declarations", () => {
  assert.deepEqual(pkg.exports["."], {
    import: { types: "./lib/index.d.mts", default: "./lib/index.mjs" },
    require: { types: "./lib/index.d.ts", default: "./lib/index.js" },
  });
  assert.equal(pkg.dependencies, undefined);
});

test("build contract rejects an unexpected fifth lib entry", () => {
  const temporaryLib = mkdtempSync(
    join(tmpdir(), "medical-device-symbols-build-contract-"),
  );

  try {
    for (const filename of [
      "index.d.mts",
      "index.d.ts",
      "index.js",
      "index.mjs",
      "unexpected-output.js",
    ]) {
      writeFileSync(join(temporaryLib, filename), "");
    }
    assert.throws(
      () => validateOutputFileSurface(temporaryLib),
      assert.AssertionError,
    );
  } finally {
    rmSync(temporaryLib, { recursive: true, force: true });
  }
});

test("public API contract rejects the same extra root export in both formats", async () => {
  const cjsApi = { ...require(outputs.cjs), UnexpectedExport: true };
  const esmApi = { ...(await import(outputs.esm)), UnexpectedExport: true };

  for (const packageApi of [cjsApi, esmApi]) {
    assert.throws(
      () => validatePublicApi(packageApi, expectedApi),
      assert.AssertionError,
    );
  }
});

test("build contract rejects a missing component declaration", () => {
  const declarations = readFileSync(outputs.cjsTypes, "utf8");
  assert.match(declarations, /^export declare const CautionIcon:.*\n/m);
  const missingComponent = declarations.replace(
    /^export declare const CautionIcon:.*\n/m,
    "",
  );

  assert.throws(
    () => validateDeclarationSurface(missingComponent, "index.d.ts"),
    assert.AssertionError,
  );
});

test("build contract rejects an extra declaration export", () => {
  const declarations = readFileSync(outputs.cjsTypes, "utf8");
  const extraDeclaration = `${declarations}export declare const UnexpectedIcon: unknown;\n`;

  assert.throws(
    () => validateDeclarationSurface(extraDeclaration, "index.d.ts"),
    assert.AssertionError,
  );
});

test("built entry points preserve the public API and keep React external", async () => {
  validateOutputFileSurface(join(root, "lib"));

  const cjsApi = require(outputs.cjs);
  const esmApi = await import(outputs.esm);
  validatePublicApi(cjsApi, expectedApi);
  validatePublicApi(esmApi, expectedApi);

  const cjs = readFileSync(outputs.cjs, "utf8");
  const esm = readFileSync(outputs.esm, "utf8");
  const declarations = readFileSync(outputs.cjsTypes, "utf8");
  const esmDeclarations = readFileSync(outputs.esmTypes, "utf8");
  assert.match(cjs, /require\(["']react["']\)/);
  assert.match(esm, /from\s+["']react["']/);
  assert.doesNotMatch(`${cjs}\n${esm}`, /react\.production/);
  validateDeclarationSurface(declarations, "index.d.ts");
  validateDeclarationSurface(esmDeclarations, "index.d.mts");
  assert.equal(esmDeclarations, declarations);
});
