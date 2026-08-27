const assert = require("node:assert/strict");
const test = require("node:test");

const expected = require("./fixtures/public-api.json");
const { validatePublicApi } = require("./helpers/public-api-contract.cjs");
const cjsApi = require("../lib/index.js");

test("the CommonJS entry point matches the exact 29-icon public API", () => {
  assert.equal(expected.components.length, 29);
  validatePublicApi(cjsApi, expected);
});

test("the ESM entry point exposes the same keys and public API as CommonJS", async () => {
  const esmApi = await import("../lib/index.mjs");

  assert.deepEqual(Object.keys(esmApi).sort(), Object.keys(cjsApi).sort());
  validatePublicApi(esmApi, expected);
});

test("the public API validator rejects an empty export surface", () => {
  assert.throws(
    () => validatePublicApi({ icons: {}, ICON_NAMES: {} }, expected),
    assert.AssertionError,
  );
});
