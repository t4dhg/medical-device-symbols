const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
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

const root = join(__dirname, "..");
const script = join(root, "scripts", "generate-table.mjs");
const galleryModule = import(script);

test("gallery rendering is deterministic and uses direct lexical icon ordering", async () => {
  const { renderGallery } = await galleryModule;
  const originalLocaleCompare = String.prototype.localeCompare;

  try {
    String.prototype.localeCompare = () => {
      throw new Error("localeCompare must not be used");
    };
    const gallery = renderGallery({
      iconsDirectory: join(root, "src", "icons"),
      packageVersion: "2.2.0",
    });
    assert.equal(
      gallery,
      renderGallery({
        iconsDirectory: join(root, "src", "icons"),
        packageVersion: "2.2.0",
      }),
    );
    assert.equal((gallery.match(/^\| <img /gm) || []).length, 29);
    assert.ok(
      gallery.indexOf("AtmosphericPressureLimitationIcon")
        < gallery.indexOf("BatchCodeIcon"),
    );
    assert.ok(gallery.indexOf("CeBsiIcon") < gallery.indexOf("CeIcon"));
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }
});

test("gallery check rejects a mutated row without changing the README", async () => {
  const { writeOrCheckGallery } = await galleryModule;
  const temporaryRoot = mkdtempSync(join(tmpdir(), "medical-symbol-gallery-"));
  const readmeFile = join(temporaryRoot, "README.md");

  try {
    const staleBeforeUpdate = readFileSync(join(root, "README.md"), "utf8")
      .replace("Atmospheric Pressure Limitation", "Stale Before Update");
    writeFileSync(readmeFile, staleBeforeUpdate);
    assert.equal(
      writeOrCheckGallery({
        iconsDirectory: join(root, "src", "icons"),
        readmeFile,
        packageVersion: "2.2.0",
        check: false,
      }),
      true,
    );
    const current = readFileSync(readmeFile, "utf8");
    assert.doesNotMatch(current, /Stale Before Update/);
    assert.deepEqual(readdirSync(temporaryRoot), ["README.md"]);
    const mutated = current.replace(
      "Atmospheric Pressure Limitation",
      "Altered Gallery Row",
    );
    assert.notEqual(mutated, current);
    writeFileSync(readmeFile, mutated);

    assert.throws(
      () => writeOrCheckGallery({
        iconsDirectory: join(root, "src", "icons"),
        readmeFile,
        packageVersion: "2.2.0",
        check: true,
      }),
      /out of date/i,
    );
    assert.equal(readFileSync(readmeFile, "utf8"), mutated);
    assert.deepEqual(readdirSync(temporaryRoot), ["README.md"]);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("repository gallery check mode succeeds without mutating README", () => {
  const before = readFileSync(join(root, "README.md"));
  const result = spawnSync(process.execPath, [script, "--check"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.equal(readFileSync(join(root, "README.md")).equals(before), true);
});
