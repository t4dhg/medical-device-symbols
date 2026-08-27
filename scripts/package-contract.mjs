import assert from "node:assert/strict";
import { lstatSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, inflateRawSync } from "node:zlib";

const BLOCK_SIZE = 512;
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptsDirectory, "..");
const repositoryPackage = JSON.parse(
  readFileSync(join(repositoryRoot, "package.json"), "utf8"),
);
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export const EXPECTED_PACKAGE_FILES = [
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

const EXPECTED_EXPORTS = {
  ".": {
    import: {
      types: "./lib/index.d.mts",
      default: "./lib/index.mjs",
    },
    require: {
      types: "./lib/index.d.ts",
      default: "./lib/index.js",
    },
  },
  "./package.json": "./package.json",
};
const WINDOWS_RESERVED_BASENAME =
  /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const FORBIDDEN_DIRECTORY = /^(?:src|source|sources|test|tests|__tests__)$/i;

function isZeroBlock(block) {
  return block.every((byte) => byte === 0);
}

function decodeStringField(header, offset, length, label) {
  const field = header.subarray(offset, offset + length);
  const nul = field.indexOf(0);
  assert.notEqual(nul, -1, `${label} must be NUL-terminated`);
  assert.ok(
    field.subarray(nul).every((byte) => byte === 0),
    `${label} has nonzero bytes after its terminator`,
  );
  return utf8Decoder.decode(field.subarray(0, nul));
}

function parseOctalField(
  header,
  offset,
  length,
  label,
  { allowBlankZero = false } = {},
) {
  const field = header.subarray(offset, offset + length);
  assert.ok(
    field.every((byte) => (byte & 0x80) === 0),
    `${label} uses high-bit numeric encoding`,
  );
  assert.ok(
    field.every(
      (byte) => byte === 0 || byte === 0x20 || (byte >= 0x30 && byte <= 0x37),
    ),
    `${label} contains an invalid raw byte`,
  );
  const text = field
    .toString("ascii")
    .replace(/[\0 ]+$/u, "")
    .trimStart();
  if (text === "" && allowBlankZero) return 0;
  assert.match(text, /^[0-7]+$/u, `${label} is not strict octal`);
  const value = Number.parseInt(text, 8);
  assert.ok(Number.isSafeInteger(value), `${label} is outside the safe range`);
  return value;
}

function validateHeaderChecksum(header) {
  const expected = parseOctalField(header, 148, 8, "tar checksum");
  const checksumHeader = Buffer.from(header);
  checksumHeader.fill(0x20, 148, 156);
  const actual = checksumHeader.reduce((sum, byte) => sum + byte, 0);
  assert.equal(actual, expected, "tar header checksum mismatch");
}

function validatePortablePath(path) {
  assert.equal(path.startsWith("/"), false, `absolute archive path: ${path}`);
  assert.doesNotMatch(
    path,
    /^[A-Za-z]:/u,
    `drive-qualified archive path: ${path}`,
  );
  assert.doesNotMatch(path, /\\/u, `backslash in archive path: ${path}`);
  assert.doesNotMatch(
    path,
    /[\0-\x1f\x7f]/u,
    `control byte in archive path: ${path}`,
  );

  const segments = path.split("/");
  assert.equal(
    segments[0],
    "package",
    `archive path is outside package/: ${path}`,
  );
  assert.ok(
    segments.length > 1,
    `archive entry cannot be package root: ${path}`,
  );
  for (const [index, segment] of segments.entries()) {
    assert.notEqual(segment, "", `empty archive path segment: ${path}`);
    assert.notEqual(segment, ".", `dot archive path segment: ${path}`);
    assert.notEqual(segment, "..", `traversal archive path segment: ${path}`);
    assert.match(
      segment,
      /^[A-Za-z0-9][A-Za-z0-9._-]*$/u,
      `nonportable archive basename: ${segment}`,
    );
    assert.doesNotMatch(
      segment,
      WINDOWS_RESERVED_BASENAME,
      `reserved archive basename: ${segment}`,
    );
    assert.equal(
      /[. ]$/u.test(segment),
      false,
      `nonportable archive basename: ${segment}`,
    );
    if (index > 0 && index < segments.length - 1) {
      assert.doesNotMatch(
        segment,
        FORBIDDEN_DIRECTORY,
        `source or test archive directory: ${segment}`,
      );
    }
  }
  const basename_ = segments.at(-1);
  assert.equal(
    basename_.startsWith("."),
    false,
    `private archive basename: ${basename_}`,
  );
  return segments.slice(1).join("/");
}

function validateManifest(content) {
  let manifest;
  try {
    manifest = JSON.parse(utf8Decoder.decode(content));
  } catch (error) {
    throw new Error("archived package.json is not valid UTF-8 JSON", {
      cause: error,
    });
  }

  assert.equal(manifest.name, "medical-device-symbols");
  assert.equal(manifest.version, repositoryPackage.version);
  assert.equal(manifest.main, "./lib/index.js");
  assert.equal(manifest.module, "./lib/index.mjs");
  assert.equal(manifest.types, "./lib/index.d.ts");
  assert.equal(manifest.sideEffects, false);
  assert.deepEqual(manifest.engines, { node: ">=18.0.0" });
  assert.deepEqual(manifest.peerDependencies, {
    react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0",
  });
  assert.deepEqual(manifest.exports, EXPECTED_EXPORTS);
  assert.deepEqual(manifest.files, ["lib", "CHANGELOG.md", "CONTRIBUTING.md"]);
  for (const key of [
    "dependencies",
    "optionalDependencies",
    "bundledDependencies",
    "bundleDependencies",
  ]) {
    assert.equal(
      manifest[key],
      undefined,
      `runtime dependency field must be absent: ${key}`,
    );
  }
}

export function validatePackReport(report, tarball) {
  assert.ok(Array.isArray(report), "npm pack report must be an array");
  assert.equal(report.length, 1, "npm pack must produce exactly one tarball");
  assert.equal(typeof tarball, "string", "tarball path must be a string");
  const [entry] = report;
  assert.equal(entry.name, "medical-device-symbols");
  assert.equal(entry.version, repositoryPackage.version);
  assert.equal(entry.filename, basename(tarball));
  assert.equal(entry.entryCount, EXPECTED_PACKAGE_FILES.length);
  assert.ok(
    Array.isArray(entry.files),
    "npm pack report files must be an array",
  );
  const paths = entry.files.map((file) => file.path).sort();
  assert.deepEqual(paths, EXPECTED_PACKAGE_FILES);
  assert.equal(
    new Set(paths).size,
    paths.length,
    "npm pack report contains duplicate files",
  );
  return entry;
}

function skipGzipTerminatedField(buffer, offset, label) {
  const terminator = buffer.indexOf(0, offset);
  assert.ok(terminator !== -1, `${label} is not NUL-terminated`);
  return terminator + 1;
}

function gunzipSingleMember(buffer) {
  assert.ok(buffer.length >= 18, "gzip stream is too short");
  assert.equal(buffer[0], 0x1f, "invalid gzip magic");
  assert.equal(buffer[1], 0x8b, "invalid gzip magic");
  assert.equal(buffer[2], 8, "unsupported gzip compression method");
  const flags = buffer[3];
  assert.equal(flags & 0xe0, 0, "gzip reserved flags must be zero");

  let offset = 10;
  if ((flags & 0x04) !== 0) {
    assert.ok(offset + 2 <= buffer.length - 8, "truncated gzip extra length");
    const extraLength = buffer.readUInt16LE(offset);
    offset += 2 + extraLength;
    assert.ok(offset <= buffer.length - 8, "truncated gzip extra field");
  }
  if ((flags & 0x08) !== 0) {
    offset = skipGzipTerminatedField(buffer, offset, "gzip file name");
  }
  if ((flags & 0x10) !== 0) {
    offset = skipGzipTerminatedField(buffer, offset, "gzip comment");
  }
  if ((flags & 0x02) !== 0) offset += 2;
  assert.ok(offset <= buffer.length - 8, "truncated gzip header");

  const result = inflateRawSync(buffer.subarray(offset), { info: true });
  assert.equal(
    offset + result.engine.bytesWritten + 8,
    buffer.length,
    "gzip input must contain exactly one member and no trailing bytes",
  );
  return gunzipSync(buffer);
}

export function validateTarball(buffer) {
  assert.ok(Buffer.isBuffer(buffer), "tarball must be a Buffer");
  const archive = gunzipSingleMember(buffer);
  assert.ok(archive.length >= BLOCK_SIZE * 2, "tar archive is too short");
  assert.equal(
    archive.length % BLOCK_SIZE,
    0,
    "tar archive length is not block-aligned",
  );

  const paths = [];
  const pathSet = new Set();
  let packageJson;
  let offset = 0;
  let terminated = false;

  while (offset < archive.length) {
    const header = archive.subarray(offset, offset + BLOCK_SIZE);
    if (isZeroBlock(header)) {
      const second = archive.subarray(
        offset + BLOCK_SIZE,
        offset + BLOCK_SIZE * 2,
      );
      assert.equal(
        second.length,
        BLOCK_SIZE,
        "tar archive has only one terminal zero block",
      );
      assert.ok(
        isZeroBlock(second),
        "tar archive has only one terminal zero block",
      );
      assert.equal(
        offset + BLOCK_SIZE * 2,
        archive.length,
        "tar archive must end after exactly one zero-block pair",
      );
      terminated = true;
      break;
    }

    validateHeaderChecksum(header);
    assert.equal(
      header.subarray(257, 263).toString("latin1"),
      "ustar\0",
      "unsupported tar magic",
    );
    assert.equal(
      header.subarray(263, 265).toString("ascii"),
      "00",
      "unsupported tar version",
    );
    assert.equal(
      decodeStringField(header, 345, 155, "tar prefix"),
      "",
      "tar prefixes are forbidden",
    );
    assert.equal(
      decodeStringField(header, 157, 100, "tar link name"),
      "",
      "tar links are forbidden",
    );
    assert.equal(
      decodeStringField(header, 265, 32, "tar user name"),
      "",
      "tar user names are forbidden",
    );
    assert.equal(
      decodeStringField(header, 297, 32, "tar group name"),
      "",
      "tar group names are forbidden",
    );
    assert.equal(
      parseOctalField(header, 100, 8, "tar mode"),
      0o644,
      "published files must use mode 0644",
    );
    assert.equal(
      parseOctalField(header, 108, 8, "tar uid", { allowBlankZero: true }),
      0,
      "tar uid must be zero",
    );
    assert.equal(
      parseOctalField(header, 116, 8, "tar gid", { allowBlankZero: true }),
      0,
      "tar gid must be zero",
    );
    assert.equal(
      parseOctalField(header, 329, 8, "tar device major", {
        allowBlankZero: true,
      }),
      0,
      "tar device major must be zero",
    );
    assert.equal(
      parseOctalField(header, 337, 8, "tar device minor", {
        allowBlankZero: true,
      }),
      0,
      "tar device minor must be zero",
    );
    assert.ok(
      header.subarray(500).every((byte) => byte === 0),
      "tar reserved header bytes must be zero",
    );
    parseOctalField(header, 136, 12, "tar mtime");

    const type = header[156];
    assert.ok(
      type === 0 || type === 0x30,
      `non-regular tar entry type: ${String.fromCharCode(type)}`,
    );
    const path = decodeStringField(header, 0, 100, "tar path");
    const relativePath = validatePortablePath(path);
    assert.equal(
      pathSet.has(relativePath),
      false,
      `duplicate tar entry: ${relativePath}`,
    );
    pathSet.add(relativePath);
    paths.push(relativePath);

    const size = parseOctalField(header, 124, 12, "tar size");
    const contentStart = offset + BLOCK_SIZE;
    const paddedSize = Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
    const nextOffset = contentStart + paddedSize;
    assert.ok(
      nextOffset <= archive.length,
      `tar entry exceeds archive: ${path}`,
    );
    const content = archive.subarray(contentStart, contentStart + size);
    const padding = archive.subarray(contentStart + size, nextOffset);
    assert.ok(
      padding.every((byte) => byte === 0),
      `nonzero tar padding: ${path}`,
    );
    if (relativePath === "package.json") packageJson = content;
    offset = nextOffset;
  }

  assert.equal(
    terminated,
    true,
    "tar archive is missing its terminal zero-block pair",
  );
  assert.deepEqual(paths.sort(), EXPECTED_PACKAGE_FILES);
  assert.ok(packageJson !== undefined, "tar archive is missing package.json");
  validateManifest(packageJson);
  return paths;
}

export function parseSuppliedTarballArgs(args) {
  assert.ok(Array.isArray(args), "arguments must be an array");
  if (args.length === 0) return undefined;
  if (args.length !== 2 || args[0] !== "--tarball") {
    throw new Error(
      "usage: test-package.mjs [--tarball /absolute/package.tgz]",
    );
  }
  const tarball = args[1];
  if (!isAbsolute(tarball))
    throw new Error("supplied tarball path must be absolute");
  if (!tarball.endsWith(".tgz"))
    throw new Error("supplied tarball must use the .tgz extension");
  let stats;
  try {
    stats = lstatSync(tarball);
  } catch {
    throw new Error(
      `supplied tarball is not an existing regular file: ${tarball}`,
    );
  }
  if (!stats.isFile()) {
    throw new Error(
      `supplied tarball is not an existing regular file: ${tarball}`,
    );
  }
  return tarball;
}
