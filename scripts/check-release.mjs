#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync, inflateRawSync } from "node:zlib";

const releasePackageName = "medical-device-symbols";
const releaseRepository = "t4dhg/medical-device-symbols";
const releaseRepositoryUrl = "https://github.com/t4dhg/medical-device-symbols";
const releaseWorkflowPath = ".github/workflows/release.yml";
const stableTag = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;
const commitPattern = /^[0-9a-f]{40}$/u;
const npmRegistry = "https://registry.npmjs.org";
const npmVersion = "11.19.0";
const expectedPackageFiles = [
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "lib/index.d.mts",
  "lib/index.d.ts",
  "lib/index.js",
  "lib/index.mjs",
  "package.json",
];
const manifestKeys = [
  "commit",
  "files",
  "integrity",
  "name",
  "schemaVersion",
  "sha256",
  "sha512",
  "size",
  "tag",
  "tarball",
  "verifier",
  "verifierSha256",
  "version",
].sort();
const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = dirname(scriptPath);
const defaultRepositoryRoot = resolve(scriptDirectory, "..");
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

function fail(scope, message) {
  throw new Error(`${scope}: ${message}`);
}

function assertExactKeys(value, keys, scope) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(scope, "expected an object");
  }
  const actual = Object.keys(value).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...keys].sort())) {
    fail(scope, `unexpected keys: ${actual.join(", ")}`);
  }
}

function parseJson(text, scope) {
  if (typeof text !== "string" || text.trim() === "") {
    fail(scope, "expected JSON output");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${scope}: invalid or noisy JSON`, { cause: error });
  }
}

function hash(buffer, algorithm, encoding = "hex") {
  return createHash(algorithm).update(buffer).digest(encoding);
}

function readRegularFile(path, scope) {
  let stats;
  try {
    stats = lstatSync(path);
  } catch (error) {
    throw new Error(`${scope}: missing file ${basename(path)}`, {
      cause: error,
    });
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail(scope, `${basename(path)} must be a regular non-symlink file`);
  }
  return readFileSync(path);
}

function equalBytes(left, right) {
  return (
    left.length === right.length &&
    timingSafeEqual(Buffer.from(left), Buffer.from(right))
  );
}

function scrubTokenEnvironment(environment = process.env) {
  const scrubbed = { ...environment };
  for (const key of [
    "NODE_AUTH_TOKEN",
    "NPM_TOKEN",
    "GH_TOKEN",
    "GITHUB_TOKEN",
  ]) {
    delete scrubbed[key];
  }
  return scrubbed;
}

function describeCommand(command, args) {
  return [command, ...args].map((part) => JSON.stringify(part)).join(" ");
}

function spawnRaw(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    input: options.input,
    shell: false,
    stdio: options.stdio ?? "pipe",
  });
}

export function runSubprocess(command, args, options = {}) {
  if (typeof command !== "string" || command === "") {
    fail("subprocess", "command must be a nonempty string");
  }
  if (
    !Array.isArray(args) ||
    args.some((argument) => typeof argument !== "string")
  ) {
    fail("subprocess", "arguments must be strings");
  }
  const result = spawnRaw(command, args, options);
  const description = describeCommand(command, args);
  if (result.error) {
    throw new Error(`could not spawn ${description}: ${result.error.message}`, {
      cause: result.error,
    });
  }
  if (result.signal) {
    throw new Error(`${description} terminated by signal ${result.signal}`);
  }
  if (result.status !== 0) {
    const stdout = result.stdout ? `\nstdout:\n${result.stdout}` : "";
    const stderr = result.stderr ? `\nstderr:\n${result.stderr}` : "";
    throw new Error(
      `${description} exited with status ${String(result.status)}${stdout}${stderr}`,
    );
  }
  return result;
}

export function validateStableTag(value) {
  if (typeof value !== "string" || !stableTag.test(value)) {
    fail("stable release tag", "expected canonical vMAJOR.MINOR.PATCH");
  }
  return value.slice(1);
}

function validateCommit(value, scope = "release preflight") {
  if (typeof value !== "string" || !commitPattern.test(value)) {
    fail(scope, "expected a lowercase 40-hex commit");
  }
  return value;
}

function git(repositoryRoot, args, subprocess) {
  try {
    return subprocess("git", args, { cwd: repositoryRoot }).stdout.trim();
  } catch (error) {
    throw new Error(`release preflight: git ${args[0]} failed`, {
      cause: error,
    });
  }
}

function readPackage(repositoryRoot, scope) {
  const manifest = parseJson(
    readRegularFile(join(repositoryRoot, "package.json"), scope).toString(
      "utf8",
    ),
    scope,
  );
  if (manifest.name !== releasePackageName) {
    fail(scope, `package name must be ${releasePackageName}`);
  }
  const repository = manifest.repository;
  if (
    repository?.type !== "git" ||
    repository?.url !== `git+${releaseRepositoryUrl}.git`
  ) {
    fail(scope, "package repository identity is incorrect");
  }
  return manifest;
}

export function preflightRelease({
  repositoryRoot = defaultRepositoryRoot,
  environment = process.env,
  subprocess = runSubprocess,
} = {}) {
  const scope = "release preflight";
  if (environment.GITHUB_EVENT_NAME !== "push") {
    fail(scope, "event must be push");
  }
  if (environment.GITHUB_REPOSITORY !== releaseRepository) {
    fail(scope, `repository must be ${releaseRepository}`);
  }
  if (environment.GITHUB_REF_TYPE !== "tag") {
    fail(scope, "ref type must be tag");
  }
  const version = validateStableTag(environment.GITHUB_REF_NAME);
  const tag = environment.GITHUB_REF_NAME;
  if (environment.GITHUB_REF !== `refs/tags/${tag}`) {
    fail(scope, "event ref and tag name differ");
  }
  const eventCommit = validateCommit(environment.GITHUB_SHA, scope);
  const packageManifest = readPackage(repositoryRoot, scope);
  if (packageManifest.version !== version) {
    fail(scope, "tag and package version differ");
  }

  const allowedOrigins = new Set([
    releaseRepositoryUrl,
    `${releaseRepositoryUrl}.git`,
    `git@github.com:${releaseRepository}`,
    `git@github.com:${releaseRepository}.git`,
  ]);
  const origin = git(
    repositoryRoot,
    ["remote", "get-url", "origin"],
    subprocess,
  );
  if (!allowedOrigins.has(origin))
    fail(scope, "origin is not the release repository");
  if (
    git(
      repositoryRoot,
      ["rev-parse", "--is-shallow-repository"],
      subprocess,
    ) !== "false"
  ) {
    fail(scope, "checkout must not be shallow");
  }
  const tagRef = `refs/tags/${tag}`;
  if (git(repositoryRoot, ["cat-file", "-t", tagRef], subprocess) !== "tag") {
    fail(scope, "release tag must be annotated");
  }
  const peeledTag = validateCommit(
    git(repositoryRoot, ["rev-parse", `${tagRef}^{commit}`], subprocess),
    scope,
  );
  const peeledEvent = validateCommit(
    git(repositoryRoot, ["rev-parse", `${eventCommit}^{commit}`], subprocess),
    scope,
  );
  if (peeledTag !== eventCommit || peeledEvent !== eventCommit) {
    fail(scope, "tag, event SHA, and peeled commit differ");
  }
  try {
    subprocess(
      "git",
      [
        "fetch",
        "--no-tags",
        "origin",
        "refs/heads/master:refs/remotes/origin/master",
      ],
      { cwd: repositoryRoot },
    );
  } catch (error) {
    throw new Error(`${scope}: mandatory master fetch failed`, {
      cause: error,
    });
  }
  validateCommit(
    git(
      repositoryRoot,
      ["rev-parse", "refs/remotes/origin/master"],
      subprocess,
    ),
    scope,
  );
  try {
    subprocess(
      "git",
      ["merge-base", "--is-ancestor", peeledTag, "refs/remotes/origin/master"],
      { cwd: repositoryRoot },
    );
  } catch {
    fail(scope, "release commit must be an ancestor of fresh origin/master");
  }
  return { name: releasePackageName, version, tag, commit: peeledTag };
}

function parseOctal(header, offset, length, label) {
  const field = header.subarray(offset, offset + length);
  if (
    !field.every(
      (byte) => byte === 0 || byte === 0x20 || (byte >= 0x30 && byte <= 0x37),
    )
  ) {
    fail("release bundle", `${label} is not strict octal`);
  }
  const text = field
    .toString("ascii")
    .replace(/[\0 ]+$/u, "")
    .trimStart();
  if (!/^[0-7]+$/u.test(text)) fail("release bundle", `${label} is empty`);
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value))
    fail("release bundle", `${label} is unsafe`);
  return value;
}

function decodeTarString(header, offset, length, label) {
  const field = header.subarray(offset, offset + length);
  const nul = field.indexOf(0);
  if (nul < 0 || !field.subarray(nul).every((byte) => byte === 0)) {
    fail("release bundle", `${label} is not strictly NUL-terminated`);
  }
  return utf8Decoder.decode(field.subarray(0, nul));
}

function gunzipOne(buffer) {
  if (
    buffer.length < 18 ||
    buffer[0] !== 0x1f ||
    buffer[1] !== 0x8b ||
    buffer[2] !== 8
  ) {
    fail("release bundle", "invalid gzip stream");
  }
  const flags = buffer[3];
  if ((flags & 0xe0) !== 0) fail("release bundle", "invalid gzip flags");
  let offset = 10;
  const skipTerminated = (label) => {
    const terminator = buffer.indexOf(0, offset);
    if (terminator < 0) fail("release bundle", `${label} is unterminated`);
    offset = terminator + 1;
  };
  if ((flags & 0x04) !== 0) {
    if (offset + 2 > buffer.length - 8)
      fail("release bundle", "truncated gzip extra");
    const length = buffer.readUInt16LE(offset);
    offset += 2 + length;
  }
  if ((flags & 0x08) !== 0) skipTerminated("gzip filename");
  if ((flags & 0x10) !== 0) skipTerminated("gzip comment");
  if ((flags & 0x02) !== 0) offset += 2;
  if (offset > buffer.length - 8)
    fail("release bundle", "truncated gzip header");
  const result = inflateRawSync(buffer.subarray(offset), { info: true });
  if (offset + result.engine.bytesWritten + 8 !== buffer.length) {
    fail("release bundle", "gzip must contain exactly one member");
  }
  return gunzipSync(buffer);
}

function validateArchive(buffer, name, version) {
  const archive = gunzipOne(buffer);
  if (archive.length % 512 !== 0 || archive.length < 1024) {
    fail("release bundle", "tar archive is not block aligned");
  }
  const files = [];
  let packageManifest;
  let offset = 0;
  let ended = false;
  while (offset < archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      const second = archive.subarray(offset + 512, offset + 1024);
      if (
        second.length !== 512 ||
        !second.every((byte) => byte === 0) ||
        offset + 1024 !== archive.length
      ) {
        fail("release bundle", "tar must end with one zero-block pair");
      }
      ended = true;
      break;
    }
    if (header.subarray(257, 263).toString("latin1") !== "ustar\0") {
      fail("release bundle", "unsupported tar format");
    }
    if (!header.subarray(345, 500).every((byte) => byte === 0)) {
      fail("release bundle", "USTAR prefix must be empty");
    }
    if (![0, 0x30].includes(header[156])) {
      fail("release bundle", "archive entries must be regular files");
    }
    if (decodeTarString(header, 157, 100, "link name") !== "") {
      fail("release bundle", "archive links are forbidden");
    }
    const path = decodeTarString(header, 0, 100, "path");
    if (
      !path.startsWith("package/") ||
      path.includes("..") ||
      path.includes("\\")
    ) {
      fail("release bundle", `unsafe archive path ${path}`);
    }
    const relativePath = path.slice("package/".length);
    if (
      !expectedPackageFiles.includes(relativePath) ||
      files.includes(relativePath)
    ) {
      fail("release bundle", `unexpected archive path ${relativePath}`);
    }
    const size = parseOctal(header, 124, 12, "tar size");
    const contentStart = offset + 512;
    const next = contentStart + Math.ceil(size / 512) * 512;
    if (next > archive.length) fail("release bundle", "truncated tar entry");
    const content = archive.subarray(contentStart, contentStart + size);
    if (relativePath === "package.json") {
      packageManifest = parseJson(
        utf8Decoder.decode(content),
        "release bundle",
      );
    }
    files.push(relativePath);
    offset = next;
  }
  if (!ended) fail("release bundle", "tar has no terminal blocks");
  if (
    JSON.stringify(files.sort()) !==
    JSON.stringify([...expectedPackageFiles].sort())
  ) {
    fail("release bundle", "archive allowlist mismatch");
  }
  if (packageManifest?.name !== name || packageManifest?.version !== version) {
    fail("release bundle", "archive package identity mismatch");
  }
  return [...files].sort();
}

function validatePackReport(report, tarballPath, version) {
  if (!Array.isArray(report) || report.length !== 1) {
    fail("release bundle", "npm pack must report exactly one archive");
  }
  const [entry] = report;
  if (
    entry.name !== releasePackageName ||
    entry.version !== version ||
    entry.filename !== basename(tarballPath) ||
    entry.entryCount !== expectedPackageFiles.length ||
    !Array.isArray(entry.files)
  ) {
    fail("release bundle", "npm pack report identity mismatch");
  }
  const files = entry.files.map((file) => file.path).sort();
  if (
    JSON.stringify(files) !== JSON.stringify([...expectedPackageFiles].sort())
  ) {
    fail("release bundle", "npm pack report allowlist mismatch");
  }
}

export function prepareReleaseBundle({
  repositoryRoot = defaultRepositoryRoot,
  bundleDirectory,
  packReportPath,
  tarballPath,
  tag,
  commit,
}) {
  const scope = "release bundle";
  if (
    !isAbsolute(bundleDirectory) ||
    !isAbsolute(packReportPath) ||
    !isAbsolute(tarballPath)
  ) {
    fail(scope, "bundle and input paths must be absolute");
  }
  const version = validateStableTag(tag);
  validateCommit(commit, scope);
  const packageManifest = readPackage(repositoryRoot, scope);
  if (packageManifest.version !== version)
    fail(scope, "tag and package version differ");
  const report = parseJson(
    readRegularFile(packReportPath, scope).toString("utf8"),
    scope,
  );
  const tarball = readRegularFile(tarballPath, scope);
  validatePackReport(report, tarballPath, version);
  const files = validateArchive(tarball, releasePackageName, version);
  const verifier = readRegularFile(
    join(repositoryRoot, "scripts", "check-release.mjs"),
    scope,
  );
  const tarballName = `${releasePackageName}-${version}.tgz`;
  if (basename(tarballPath) !== tarballName)
    fail(scope, "tarball filename mismatch");
  mkdirSync(bundleDirectory);
  copyFileSync(tarballPath, join(bundleDirectory, tarballName));
  copyFileSync(
    join(repositoryRoot, "scripts", "check-release.mjs"),
    join(bundleDirectory, "check-release.mjs"),
  );
  const sha512 = hash(tarball, "sha512");
  const manifest = {
    schemaVersion: 1,
    name: releasePackageName,
    version,
    tag,
    commit,
    tarball: tarballName,
    size: tarball.length,
    integrity: `sha512-${hash(tarball, "sha512", "base64")}`,
    sha256: hash(tarball, "sha256"),
    sha512,
    files,
    verifier: "check-release.mjs",
    verifierSha256: hash(verifier, "sha256"),
  };
  writeFileSync(
    join(bundleDirectory, "release-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: "wx", mode: 0o644 },
  );
  validateReleaseBundle({
    bundleDirectory,
    expectedTag: tag,
    expectedCommit: commit,
  });
  return manifest;
}

export function validateReleaseBundle({
  bundleDirectory,
  expectedTag,
  expectedCommit,
}) {
  const scope = "release bundle";
  if (!isAbsolute(bundleDirectory)) fail(scope, "bundle path must be absolute");
  let entries;
  try {
    entries = readdirSync(bundleDirectory).sort();
  } catch (error) {
    throw new Error(`${scope}: cannot read bundle directory`, { cause: error });
  }
  const manifestBytes = readRegularFile(
    join(bundleDirectory, "release-manifest.json"),
    scope,
  );
  const manifest = parseJson(utf8Decoder.decode(manifestBytes), scope);
  assertExactKeys(manifest, manifestKeys, scope);
  if (manifest.schemaVersion !== 1 || manifest.name !== releasePackageName) {
    fail(scope, "manifest schema or package name mismatch");
  }
  const version = validateStableTag(manifest.tag);
  validateCommit(manifest.commit, scope);
  if (manifest.version !== version)
    fail(scope, "manifest tag and version differ");
  if (expectedTag !== undefined && manifest.tag !== expectedTag) {
    fail(scope, "manifest tag differs from expected tag");
  }
  if (expectedCommit !== undefined && manifest.commit !== expectedCommit) {
    fail(scope, "manifest commit differs from expected commit");
  }
  const tarballName = `${releasePackageName}-${version}.tgz`;
  if (
    manifest.tarball !== tarballName ||
    manifest.verifier !== "check-release.mjs"
  ) {
    fail(scope, "manifest filenames are not canonical");
  }
  const expectedEntries = [
    "check-release.mjs",
    "release-manifest.json",
    tarballName,
  ].sort();
  if (JSON.stringify(entries) !== JSON.stringify(expectedEntries)) {
    fail(scope, "bundle must contain exactly three files");
  }
  for (const entry of entries)
    readRegularFile(join(bundleDirectory, entry), scope);
  const tarball = readRegularFile(join(bundleDirectory, tarballName), scope);
  const verifier = readRegularFile(
    join(bundleDirectory, "check-release.mjs"),
    scope,
  );
  if (
    manifest.size !== tarball.length ||
    manifest.integrity !== `sha512-${hash(tarball, "sha512", "base64")}` ||
    manifest.sha256 !== hash(tarball, "sha256") ||
    manifest.sha512 !== hash(tarball, "sha512") ||
    manifest.verifierSha256 !== hash(verifier, "sha256")
  ) {
    fail(scope, "manifest hashes do not bind bundle bytes");
  }
  if (JSON.stringify(manifest.files) !== JSON.stringify(expectedPackageFiles)) {
    fail(scope, "manifest archive allowlist mismatch");
  }
  const archiveFiles = validateArchive(tarball, releasePackageName, version);
  if (JSON.stringify(archiveFiles) !== JSON.stringify(expectedPackageFiles)) {
    fail(scope, "archive allowlist mismatch");
  }
  return manifest;
}

function registryTarballUrl(name, version) {
  return `${npmRegistry}/${name}/-/${name}-${version}.tgz`;
}

function validateRegistryMetadata(metadata, name, version) {
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata) ||
    metadata.name !== name ||
    metadata.version !== version ||
    typeof metadata.dist?.integrity !== "string" ||
    metadata.dist.tarball !== registryTarballUrl(name, version)
  ) {
    fail("registry response", "published metadata identity mismatch");
  }
  return metadata;
}

export function classifyRegistryView(result, name, version) {
  const scope = "registry response";
  if (result?.error) fail(scope, `spawn error: ${result.error.message}`);
  if (result?.signal) fail(scope, `terminated by signal ${result.signal}`);
  if (result?.status === 0) {
    if (result.stderr !== "") fail(scope, "successful view wrote stderr");
    return {
      state: "existing",
      metadata: validateRegistryMetadata(
        parseJson(result.stdout, scope),
        name,
        version,
      ),
    };
  }
  if (result?.status !== 1 || result.stdout !== "") {
    fail(scope, "unexpected npm view status");
  }
  const error = parseJson(result.stderr, scope);
  assertExactKeys(error, ["error"], scope);
  assertExactKeys(error.error, ["code", "detail", "summary"], scope);
  const expectedDetail = `'${name}@${version}' is not in this registry.\n\nNote that you can also install from a\ntarball, folder, http url, or git url.`;
  if (
    error.error.code !== "E404" ||
    error.error.summary !== `No match found for version ${version}` ||
    error.error.detail !== expectedDetail
  ) {
    fail(
      scope,
      `response is not the exact npm ${npmVersion} missing-version shape`,
    );
  }
  return { state: "missing" };
}

function parseStableVersion(value, scope) {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u.test(value)
  ) {
    fail(scope, "expected a canonical stable version");
  }
  return value.split(".").map(BigInt);
}

function compareVersions(left, right) {
  const leftParts = parseStableVersion(left, "registry latest");
  const rightParts = parseStableVersion(right, "registry latest");
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] < rightParts[index] ? -1 : 1;
    }
  }
  return 0;
}

export function validateRegistryTarball({
  metadata,
  downloadedTarball,
  reviewedTarball,
  name,
  version,
  latest,
}) {
  const scope = "registry tarball";
  try {
    validateRegistryMetadata(metadata, name, version);
  } catch (error) {
    throw new Error(`${scope}: metadata identity mismatch`, { cause: error });
  }
  if (
    !Buffer.isBuffer(downloadedTarball) ||
    !Buffer.isBuffer(reviewedTarball)
  ) {
    fail(scope, "tarballs must be buffers");
  }
  if (!equalBytes(downloadedTarball, reviewedTarball)) {
    fail(scope, "downloaded bytes differ from reviewed bytes");
  }
  const integrity = `sha512-${hash(downloadedTarball, "sha512", "base64")}`;
  if (metadata.dist.integrity !== integrity) fail(scope, "SRI mismatch");
  if (latest !== version) fail(scope, "existing version must be latest");
  try {
    validateArchive(downloadedTarball, name, version);
  } catch (error) {
    throw new Error(`${scope}: archive validation failed`, { cause: error });
  }
  return metadata;
}

export async function pollRegistry({
  name,
  version,
  latest,
  attempts = 12,
  inspect,
  wait = (milliseconds) =>
    new Promise((resolve_) => setTimeout(resolve_, milliseconds)),
  intervalMilliseconds = 5000,
}) {
  if (!Number.isSafeInteger(attempts) || attempts < 1) {
    fail("registry poll", "attempt count must be positive");
  }
  if (compareVersions(latest, version) >= 0) {
    fail(
      "registry latest",
      "missing release requires latest to be strictly older",
    );
  }
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const state = await inspect();
    if (state?.state === "existing") return state;
    if (state?.state !== "missing")
      fail("registry poll", "indeterminate registry state");
    if (attempt < attempts) await wait(intervalMilliseconds);
  }
  fail("registry poll", "release did not become visible before the poll limit");
}

export function validateAuditSignatures(audit, name, version) {
  const scope = "audit signatures";
  if (
    audit === null ||
    typeof audit !== "object" ||
    !Array.isArray(audit.invalid) ||
    !Array.isArray(audit.missing) ||
    !Array.isArray(audit.verified) ||
    audit.invalid.length !== 0 ||
    audit.missing.length !== 0
  ) {
    fail(scope, "invalid or missing signatures were reported");
  }
  const matches = audit.verified.filter(
    (entry) => entry?.name === name && entry?.version === version,
  );
  if (matches.length !== 1)
    fail(scope, "expected exactly one verified release target");
  const [verified] = matches;
  if (
    verified.location !== `node_modules/${name}` ||
    verified.registry !== `${npmRegistry}/` ||
    verified.attestations?.provenance?.predicateType !==
      "https://slsa.dev/provenance/v1" ||
    !Array.isArray(verified.attestationBundles) ||
    verified.attestationBundles.length !== 1 ||
    verified.attestationBundles[0]?.predicateType !==
      "https://slsa.dev/provenance/v1"
  ) {
    fail(scope, "verified target attestation shape is incorrect");
  }
  return verified;
}

function decodePayload(payload) {
  if (typeof payload !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/u.test(payload)) {
    fail("provenance", "DSSE payload is not canonical base64");
  }
  const bytes = Buffer.from(payload, "base64");
  if (bytes.toString("base64") !== payload) {
    fail("provenance", "DSSE payload is not canonical base64");
  }
  return parseJson(utf8Decoder.decode(bytes), "provenance");
}

export function validateProvenance(
  verified,
  { name, version, tag, commit, sha512 },
) {
  const scope = "provenance";
  validateStableTag(tag);
  validateCommit(commit, scope);
  if (!/^[0-9a-f]{128}$/u.test(sha512))
    fail(scope, "expected SHA-512 hex digest");
  const bundle = verified?.attestationBundles?.[0];
  if (
    verified?.attestationBundles?.length !== 1 ||
    bundle?.predicateType !== "https://slsa.dev/provenance/v1" ||
    bundle.bundle?.dsseEnvelope?.payloadType !==
      "application/vnd.in-toto+json" ||
    !Array.isArray(bundle.bundle.dsseEnvelope.signatures) ||
    bundle.bundle.dsseEnvelope.signatures.length < 1
  ) {
    fail(scope, "expected one verified SLSA DSSE bundle");
  }
  const statement = decodePayload(bundle.bundle.dsseEnvelope.payload);
  if (
    statement._type !== "https://in-toto.io/Statement/v1" ||
    statement.predicateType !== "https://slsa.dev/provenance/v1" ||
    !Array.isArray(statement.subject) ||
    statement.subject.length !== 1 ||
    statement.subject[0]?.name !== `pkg:npm/${name}@${version}` ||
    JSON.stringify(statement.subject[0]?.digest) !== JSON.stringify({ sha512 })
  ) {
    fail(scope, "statement subject does not bind the release");
  }
  const definition = statement.predicate?.buildDefinition;
  const workflow = definition?.externalParameters?.workflow;
  if (
    definition?.buildType !==
      "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1" ||
    workflow?.repository !== releaseRepositoryUrl ||
    workflow?.path !== releaseWorkflowPath ||
    workflow?.ref !== `refs/tags/${tag}` ||
    definition?.internalParameters?.github?.event_name !== "push"
  ) {
    fail(scope, "workflow identity does not bind the release");
  }
  if (
    !Array.isArray(definition.resolvedDependencies) ||
    definition.resolvedDependencies.length !== 1 ||
    definition.resolvedDependencies[0]?.uri !==
      `git+${releaseRepositoryUrl}@refs/tags/${tag}` ||
    JSON.stringify(definition.resolvedDependencies[0]?.digest) !==
      JSON.stringify({ gitCommit: commit })
  ) {
    fail(scope, "git dependency does not bind the release commit");
  }
  if (
    statement.predicate?.runDetails?.builder?.id !==
    "https://github.com/actions/runner/github-hosted"
  ) {
    fail(scope, "builder is not GitHub-hosted");
  }
  return statement;
}

function npmRaw(args, options = {}) {
  return spawnRaw("npm", args, {
    ...options,
    env: scrubTokenEnvironment(options.env),
  });
}

function npmChecked(args, options = {}) {
  return runSubprocess("npm", args, {
    ...options,
    env: scrubTokenEnvironment(options.env),
  });
}

function parseLatest(result) {
  if (
    result.error ||
    result.signal ||
    result.status !== 0 ||
    result.stderr !== ""
  ) {
    fail("registry latest", "npm view latest was indeterminate");
  }
  const latest = parseJson(result.stdout, "registry latest");
  parseStableVersion(latest, "registry latest");
  return latest;
}

function inspectRegistry(bundleDirectory) {
  const manifest = validateReleaseBundle({ bundleDirectory });
  const view = npmRaw(
    [
      "view",
      `${manifest.name}@${manifest.version}`,
      "name",
      "version",
      "dist.integrity",
      "dist.tarball",
      "--json",
      "--registry",
      npmRegistry,
    ],
    { env: process.env },
  );
  const state = classifyRegistryView(view, manifest.name, manifest.version);
  const latest = parseLatest(
    npmRaw(
      [
        "view",
        manifest.name,
        "dist-tags.latest",
        "--json",
        "--registry",
        npmRegistry,
      ],
      { env: process.env },
    ),
  );
  if (state.state === "missing") {
    if (compareVersions(latest, manifest.version) >= 0) {
      fail(
        "registry latest",
        "missing release requires latest to be strictly older",
      );
    }
    return { manifest, state, latest };
  }
  const downloadRoot = mkdtempSync(join(tmpdir(), "medical-symbols-registry-"));
  try {
    const packed = npmChecked(
      [
        "pack",
        `${manifest.name}@${manifest.version}`,
        "--json",
        "--ignore-scripts",
        "--pack-destination",
        downloadRoot,
        "--registry",
        npmRegistry,
      ],
      { env: process.env },
    );
    const report = parseJson(packed.stdout, "registry tarball");
    const expectedFilename = `${manifest.name}-${manifest.version}.tgz`;
    if (
      !Array.isArray(report) ||
      report.length !== 1 ||
      report[0]?.name !== manifest.name ||
      report[0]?.version !== manifest.version ||
      report[0]?.filename !== expectedFilename
    ) {
      fail("registry tarball", "npm pack report is not exact");
    }
    const downloadedPath = join(downloadRoot, expectedFilename);
    validateRegistryTarball({
      metadata: state.metadata,
      downloadedTarball: readRegularFile(downloadedPath, "registry tarball"),
      reviewedTarball: readRegularFile(
        join(bundleDirectory, manifest.tarball),
        "registry tarball",
      ),
      name: manifest.name,
      version: manifest.version,
      latest,
    });
    return { manifest, state, latest };
  } finally {
    rmSync(downloadRoot, { recursive: true, force: true });
  }
}

async function verifyRegistry(bundleDirectory) {
  const initial = inspectRegistry(bundleDirectory);
  const existing =
    initial.state.state === "existing"
      ? initial
      : await pollRegistry({
          name: initial.manifest.name,
          version: initial.manifest.version,
          latest: initial.latest,
          inspect: async () => inspectRegistry(bundleDirectory).state,
        });
  const manifest = initial.manifest;
  if (existing.state?.state !== "existing" && existing.state !== "existing") {
    fail("registry verification", "published release is not exact");
  }
  const consumer = mkdtempSync(join(tmpdir(), "medical-symbols-signatures-"));
  try {
    writeFileSync(
      join(consumer, "package.json"),
      `${JSON.stringify({ name: "medical-symbols-release-audit", version: "1.0.0", private: true })}\n`,
    );
    npmChecked(
      [
        "install",
        `${manifest.name}@${manifest.version}`,
        "--ignore-scripts",
        "--omit=peer",
        "--no-audit",
        "--no-fund",
        "--registry",
        npmRegistry,
      ],
      { cwd: consumer, env: process.env },
    );
    const lock = parseJson(
      readRegularFile(
        join(consumer, "package-lock.json"),
        "registry verification",
      ).toString("utf8"),
      "registry verification",
    );
    const entry = lock.packages?.[`node_modules/${manifest.name}`];
    if (
      entry?.version !== manifest.version ||
      entry?.resolved !== registryTarballUrl(manifest.name, manifest.version) ||
      entry?.integrity !== manifest.integrity
    ) {
      fail(
        "registry verification",
        "installed lock entry differs from reviewed release",
      );
    }
    const auditResult = npmChecked(
      ["audit", "signatures", "--json", "--include-attestations"],
      { cwd: consumer, env: process.env },
    );
    const verified = validateAuditSignatures(
      parseJson(auditResult.stdout, "audit signatures"),
      manifest.name,
      manifest.version,
    );
    validateProvenance(verified, manifest);
    return { state: "verified" };
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (
      !/^--[a-z-]+$/u.test(key ?? "") ||
      value === undefined ||
      value.startsWith("--")
    ) {
      fail("release CLI", "options must be --name value pairs");
    }
    const name = key.slice(2);
    if (Object.hasOwn(options, name))
      fail("release CLI", `duplicate option ${key}`);
    options[name] = value;
  }
  return options;
}

function requireOptions(options, names) {
  assertExactKeys(options, names, "release CLI");
  for (const name of names) {
    if (
      !isAbsolute(options[name]) &&
      ["bundle", "pack-report", "tarball", "repository"].includes(name)
    ) {
      fail("release CLI", `${name} path must be absolute`);
    }
  }
}

async function main() {
  const [mode, ...argumentList] = process.argv.slice(2);
  const options = parseArguments(argumentList);
  if (mode === "preflight") {
    requireOptions(options, []);
    process.stdout.write(`${JSON.stringify(preflightRelease())}\n`);
    return;
  }
  if (mode === "prepare") {
    requireOptions(options, [
      "bundle",
      "commit",
      "pack-report",
      "repository",
      "tag",
      "tarball",
    ]);
    process.stdout.write(
      `${JSON.stringify(
        prepareReleaseBundle({
          repositoryRoot: options.repository,
          bundleDirectory: options.bundle,
          packReportPath: options["pack-report"],
          tarballPath: options.tarball,
          tag: options.tag,
          commit: options.commit,
        }),
      )}\n`,
    );
    return;
  }
  if (mode === "validate-bundle") {
    requireOptions(options, ["bundle", "commit", "tag"]);
    process.stdout.write(
      `${JSON.stringify(
        validateReleaseBundle({
          bundleDirectory: options.bundle,
          expectedTag: options.tag,
          expectedCommit: options.commit,
        }),
      )}\n`,
    );
    return;
  }
  if (mode === "registry-state") {
    requireOptions(options, ["bundle"]);
    const result = inspectRegistry(options.bundle);
    process.stdout.write(`${JSON.stringify({ state: result.state.state })}\n`);
    return;
  }
  if (mode === "verify-registry") {
    requireOptions(options, ["bundle"]);
    process.stdout.write(
      `${JSON.stringify(await verifyRegistry(options.bundle))}\n`,
    );
    return;
  }
  fail(
    "release CLI",
    "usage: check-release.mjs <preflight|prepare|validate-bundle|registry-state|verify-registry>",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
