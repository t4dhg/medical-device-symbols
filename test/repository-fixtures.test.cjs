const assert = require("node:assert/strict");
const {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join } = require("node:path");
const test = require("node:test");

const expected = require("./fixtures/public-api.json");
const { validateRepositoryFixtures } = require("./helpers/public-api-contract.cjs");

const root = join(__dirname, "..");

test("the repository retains every required example and SVG source", () => {
  validateRepositoryFixtures(root, expected);
});

test("the repository fixture validator rejects a missing required file", () => {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "medical-device-symbols-contract-"),
  );
  const requiredPaths = [...expected.examples, ...expected.sources];

  try {
    for (const relativePath of requiredPaths) {
      const absolutePath = join(temporaryRoot, relativePath);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "");
    }
    unlinkSync(join(temporaryRoot, requiredPaths[0]));

    assert.throws(
      () => validateRepositoryFixtures(temporaryRoot, expected),
      assert.AssertionError,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("the assertive unit test script replaces the print-only root scripts", () => {
  const pkg = require("../package.json");

  assert.equal(existsSync(join(root, "test-package.js")), false);
  assert.equal(existsSync(join(root, "test-icons.js")), false);
  assert.equal(pkg.scripts["test:unit"], "node --test test/*.test.cjs");
  assert.equal(pkg.scripts.test, "npm run test:unit");
});
