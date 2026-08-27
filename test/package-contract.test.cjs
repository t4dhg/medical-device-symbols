const assert = require("node:assert/strict");
const {
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, join } = require("node:path");
const test = require("node:test");
const { gzipSync } = require("node:zlib");

const root = join(__dirname, "..");
const expectedFiles = [
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "lib/index.d.mts",
  "lib/index.d.ts",
  "lib/index.js",
  "lib/index.mjs",
  "package.json",
].sort();
const modulePromise = import("../scripts/package-contract.mjs");

function writeTarString(header, offset, length, value) {
  const bytes = Buffer.from(value);
  assert.ok(bytes.length <= length);
  bytes.copy(header, offset);
}

function tarHeader({
  name,
  size,
  type = "0",
  linkName = "",
  prefix = "",
  mode = 0o644,
  corruptChecksum = false,
  base256Size = false,
  blankOwnership = false,
  uid = 0,
  gid = 0,
  deviceMajor = 0,
  deviceMinor = 0,
  reservedByte = 0,
  numericMutations = [],
}) {
  const header = Buffer.alloc(512);
  writeTarString(header, 0, 100, name);
  writeTarString(header, 100, 8, `${mode.toString(8).padStart(7, "0")}\0`);
  if (!blankOwnership) {
    writeTarString(header, 108, 8, `${uid.toString(8).padStart(7, "0")}\0`);
    writeTarString(header, 116, 8, `${gid.toString(8).padStart(7, "0")}\0`);
  }
  writeTarString(header, 124, 12, `${size.toString(8).padStart(11, "0")}\0`);
  writeTarString(header, 136, 12, "00000000000\0");
  header.fill(0x20, 148, 156);
  writeTarString(header, 156, 1, type);
  writeTarString(header, 157, 100, linkName);
  writeTarString(header, 257, 6, "ustar\0");
  writeTarString(header, 263, 2, "00");
  writeTarString(header, 329, 8, `${deviceMajor.toString(8).padStart(7, "0")}\0`);
  writeTarString(header, 337, 8, `${deviceMinor.toString(8).padStart(7, "0")}\0`);
  writeTarString(header, 345, 155, prefix);
  header[500] = reservedByte;
  if (base256Size) header[124] = 0x80;
  for (const [offset, byte] of numericMutations) header[offset] = byte;
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeTarString(
    header,
    148,
    8,
    `${(checksum + (corruptChecksum ? 1 : 0)).toString(8).padStart(6, "0")}\0 `,
  );
  return header;
}

function makeTar(entries, { terminalBlocks = 2, trailingBlock } = {}) {
  const chunks = [];
  for (const entry of entries) {
    const content = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content ?? "");
    chunks.push(tarHeader({ ...entry, size: content.length }), content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) chunks.push(Buffer.alloc(padding));
  }
  for (let index = 0; index < terminalBlocks; index += 1) {
    chunks.push(Buffer.alloc(512));
  }
  if (trailingBlock !== undefined) chunks.push(trailingBlock);
  return gzipSync(Buffer.concat(chunks), { mtime: 0 });
}

function repositoryEntries() {
  return expectedFiles.map((path) => ({
    name: `package/${path}`,
    content: readFileSync(join(root, path)),
  }));
}

function replaceEntry(entries, path, replacement) {
  return entries.map((entry) =>
    entry.name === `package/${path}` ? { ...entry, ...replacement } : entry,
  );
}

function archiveWithManifest(change) {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  change(manifest);
  return makeTar(
    replaceEntry(repositoryEntries(), "package.json", {
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    }),
  );
}

test("the tarball contract accepts exactly the nine publishable files", async () => {
  const { EXPECTED_PACKAGE_FILES, validateTarball } = await modulePromise;
  assert.deepEqual(EXPECTED_PACKAGE_FILES, expectedFiles);
  assert.deepEqual(validateTarball(makeTar(repositoryEntries())), expectedFiles);
});

test("the tarball contract accepts npm-normalized blank ownership as zero", async () => {
  const { validateTarball } = await modulePromise;
  const entries = repositoryEntries().map((entry) => ({
    ...entry,
    blankOwnership: true,
  }));
  assert.deepEqual(validateTarball(makeTar(entries)), expectedFiles);
});

test("the pack report must describe one matching nine-file tarball", async () => {
  const { validatePackReport } = await modulePromise;
  const tarball = "/tmp/pack/medical-device-symbols-2.2.0.tgz";
  const report = [
    {
      name: "medical-device-symbols",
      version: "2.2.0",
      filename: basename(tarball),
      entryCount: 9,
      files: expectedFiles.map((path) => ({ path, size: 1, mode: 0o644 })),
    },
  ];
  assert.equal(validatePackReport(report, tarball), report[0]);

  for (const invalid of [
    [],
    [...report, report[0]],
    [{ ...report[0], filename: "other.tgz" }],
    [{ ...report[0], entryCount: 8 }],
    [{ ...report[0], files: report[0].files.slice(1) }],
    [
      {
        ...report[0],
        files: [...report[0].files, { path: "src/index.tsx", size: 1 }],
      },
    ],
  ]) {
    assert.throws(() => validatePackReport(invalid, tarball));
  }
});

test("archive inventory rejects unexpected, missing, and duplicate entries", async () => {
  const { validateTarball } = await modulePromise;
  const entries = repositoryEntries();
  for (const invalid of [
    [...entries, { name: "package/SECURITY.md", content: "private" }],
    entries.slice(1),
    [...entries, entries[0]],
  ]) {
    assert.throws(() => validateTarball(makeTar(invalid)));
  }
});

test("archive paths reject absolute, traversal, backslash, and nonportable names", async () => {
  const { validateTarball } = await modulePromise;
  for (const name of [
    "/package/README.md",
    "package/lib/../index.js",
    "package\\README.md",
    "package/lib/bad:name.js",
    "package/lib/trailing-dot.",
    "package/lib/CON.js",
  ]) {
    const entries = replaceEntry(repositoryEntries(), "README.md", { name });
    assert.throws(() => validateTarball(makeTar(entries)), undefined, name);
  }
});

test("archive paths reject source, test, and private basenames", async () => {
  const { validateTarball } = await modulePromise;
  for (const name of [
    "package/src/index.js",
    "package/test/index.js",
    "package/.env",
  ]) {
    const entries = replaceEntry(repositoryEntries(), "README.md", { name });
    assert.throws(() => validateTarball(makeTar(entries)), undefined, name);
  }
});

test("archive entries reject every non-regular tar type and link metadata", async () => {
  const { validateTarball } = await modulePromise;
  for (const type of ["1", "2", "3", "4", "5", "6", "7", "g", "x", "L", "K"]) {
    const entries = replaceEntry(repositoryEntries(), "README.md", {
      type,
      linkName: type === "1" || type === "2" ? "package/LICENSE" : "",
    });
    assert.throws(() => validateTarball(makeTar(entries)), undefined, type);
  }
  const linkedRegular = replaceEntry(repositoryEntries(), "README.md", {
    linkName: "package/LICENSE",
  });
  assert.throws(() => validateTarball(makeTar(linkedRegular)));
});

test("archive headers reject corrupt checksums and hostile numeric metadata", async () => {
  const { validateTarball } = await modulePromise;
  for (const replacement of [
    { corruptChecksum: true },
    { base256Size: true },
    { prefix: "unexpected" },
    { mode: 0o755 },
    { uid: 1 },
    { gid: 1 },
    { deviceMajor: 1 },
    { deviceMinor: 1 },
    { reservedByte: 1 },
    { numericMutations: [[137, 0xb0]] },
    { numericMutations: [[145, 0xb7]] },
    { numericMutations: [[137, 0x09]] },
  ]) {
    const entries = replaceEntry(repositoryEntries(), "README.md", replacement);
    assert.throws(() => validateTarball(makeTar(entries)));
  }
});

test("gzip wrapper rejects a second member and trailing bytes", async () => {
  const { validateTarball } = await modulePromise;
  const tarball = makeTar(repositoryEntries());
  for (const suffix of [
    gzipSync(Buffer.alloc(0), { mtime: 0 }),
    Buffer.from([0]),
  ]) {
    assert.throws(() => validateTarball(Buffer.concat([tarball, suffix])));
  }
});

test("archive termination requires exactly one final zero-block pair", async () => {
  const { validateTarball } = await modulePromise;
  const entries = repositoryEntries();
  assert.throws(() => validateTarball(makeTar(entries, { terminalBlocks: 0 })));
  assert.throws(() => validateTarball(makeTar(entries, { terminalBlocks: 1 })));
  assert.throws(() => validateTarball(makeTar(entries, { terminalBlocks: 3 })));
  assert.throws(() =>
    validateTarball(
      makeTar(entries, { terminalBlocks: 2, trailingBlock: Buffer.alloc(512, 1) }),
    ),
  );
});

test("archived manifest rejects wrong identity, runtime dependencies, and contract drift", async () => {
  const { validateTarball } = await modulePromise;
  const mutations = [
    (manifest) => { manifest.name = "other-package"; },
    (manifest) => { manifest.version = "9.9.9"; },
    (manifest) => { manifest.dependencies = { react: "19.2.8" }; },
    (manifest) => { manifest.engines.node = ">=20"; },
    (manifest) => { manifest.peerDependencies.react = "^19.0.0"; },
    (manifest) => { manifest.sideEffects = true; },
    (manifest) => { manifest.exports["."].import.types = "./lib/index.d.ts"; },
    (manifest) => { manifest.exports["."].require.default = "./lib/index.mjs"; },
    (manifest) => { manifest.main = "./src/index.tsx"; },
  ];
  for (const mutate of mutations) {
    assert.throws(() => validateTarball(archiveWithManifest(mutate)));
  }
});

test("supplied tarball arguments require one absolute regular tgz", async () => {
  const { parseSuppliedTarballArgs } = await modulePromise;
  const directory = mkdtempSync(join(tmpdir(), "medical-symbols-package-args-"));
  const tarball = join(directory, "fixture.tgz");
  const symlink = join(directory, "symlink.tgz");
  writeFileSync(tarball, "fixture");
  symlinkSync(tarball, symlink);

  try {
    assert.equal(parseSuppliedTarballArgs([]), undefined);
    assert.equal(parseSuppliedTarballArgs(["--tarball", tarball]), tarball);
    for (const args of [
      ["--tarball"],
      ["--tarball", "relative.tgz"],
      ["--tarball", directory],
      ["--tarball", symlink],
      ["--tarball", join(directory, "missing.tgz")],
      ["--tarball", join(directory, "fixture.tar.gz")],
      ["--unknown"],
      ["--tarball", tarball, "extra"],
    ]) {
      assert.throws(() => parseSuppliedTarballArgs(args), undefined, args.join(" "));
    }
    assert.equal(lstatSync(tarball).isFile(), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
