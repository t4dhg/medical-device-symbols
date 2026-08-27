const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

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
    generate: "node scripts/generate-index.mjs",
    "generate:check": "node scripts/generate-index.mjs --check",
    clean: "node scripts/build.mjs --clean-only",
    typecheck: "tsc --noEmit",
    build: "npm run generate:check && node scripts/build.mjs",
    "test:unit": "node --test test/*.test.cjs",
    test: "npm run build && npm run test:unit",
  });
});

test("package entry points route each module format to matching declarations", () => {
  assert.deepEqual(pkg.exports["."], {
    import: { types: "./lib/index.d.mts", default: "./lib/index.mjs" },
    require: { types: "./lib/index.d.ts", default: "./lib/index.js" },
  });
  assert.equal(pkg.dependencies, undefined);
});

test("built entry points preserve the public API and keep React external", async () => {
  for (const output of Object.values(outputs)) {
    assert.equal(existsSync(output), true, `${output} is missing`);
  }

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
  assert.match(declarations, /export type IconName\b/);
  assert.match(declarations, /export (?:interface|type) IconProps\b/);
  assert.equal(esmDeclarations, declarations);
});
