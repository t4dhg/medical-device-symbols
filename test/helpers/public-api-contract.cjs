const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

function validatePublicApi(packageApi, expected) {
  const components = Object.keys(packageApi.icons).sort();
  assert.deepEqual(components, expected.components);
  assert.deepEqual(packageApi.ICON_NAMES, expected.iconNames);
  for (const name of expected.components) {
    assert.equal(packageApi[name], packageApi.icons[name], `${name} export drift`);
    assert.equal(packageApi[name].displayName, name, `${name} displayName drift`);
  }
  for (const retired of expected.retired) {
    assert.equal(Object.hasOwn(packageApi, retired), false, `${retired} returned`);
  }
}

function validateRepositoryFixtures(root, expected) {
  for (const relativePath of [...expected.examples, ...expected.sources]) {
    assert.equal(
      existsSync(join(root, relativePath)),
      true,
      `${relativePath} missing`,
    );
  }
}

module.exports = { validatePublicApi, validateRepositoryFixtures };
