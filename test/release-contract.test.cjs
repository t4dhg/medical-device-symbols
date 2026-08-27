const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, join, resolve } = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const { parse } = require("yaml");
const { gunzipSync, gzipSync } = require("node:zlib");

const root = resolve(__dirname, "..");
const releaseScript = join(root, "scripts", "check-release.mjs");
const workflowPath = join(root, ".github", "workflows", "release.yml");
const packageName = "medical-device-symbols";
const packageVersion = "2.2.0";
const tag = `v${packageVersion}`;
const commit = "0123456789abcdef0123456789abcdef01234567";
const expectedTarballUrl =
  "https://registry.npmjs.org/medical-device-symbols/-/medical-device-symbols-2.2.0.tgz";

let releaseModule;
let packFixture;
const temporaryRoots = [];

function temporaryRoot(prefix = "medical-symbols-release-") {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  temporaryRoots.push(directory);
  return directory;
}

test.after(() => {
  for (const directory of temporaryRoots) {
    rmSync(directory, { recursive: true, force: true });
  }
});

async function loadReleaseModule() {
  if (!releaseModule) {
    releaseModule = await import(
      `${pathToFileURL(releaseScript).href}?test=${Date.now()}`
    );
  }
  return releaseModule;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  }).trim();
}

function writeExecutable(path, source) {
  writeFileSync(path, source, { mode: 0o755 });
  chmodSync(path, 0o755);
}

function rebindBundleTarball(bundleDirectory, tarball) {
  const manifestPath = join(bundleDirectory, "release-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  writeFileSync(join(bundleDirectory, manifest.tarball), tarball);
  manifest.size = tarball.length;
  manifest.integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
  manifest.sha256 = createHash("sha256").update(tarball).digest("hex");
  manifest.sha512 = createHash("sha512").update(tarball).digest("hex");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function addRecomputedUstarPrefix(tarball) {
  const archive = gunzipSync(tarball);
  const header = archive.subarray(0, 512);
  header[345] = 0x78;
  header.fill(0x20, 148, 156);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(checksum.toString(8).padStart(6, "0"), 148, 6, "ascii");
  header[154] = 0;
  header[155] = 0x20;
  return gzipSync(archive);
}

function createGitFixture({ shallow = false } = {}) {
  const fixtureRoot = temporaryRoot("medical-symbols-release-git-");
  const originDirectory = join(fixtureRoot, "origin.git");
  const seedDirectory = join(fixtureRoot, "seed");
  const directory = join(fixtureRoot, "checkout");
  run("git", ["init", "--bare", "--initial-branch=master", originDirectory]);
  run("git", ["init", "--initial-branch=master", seedDirectory]);
  run("git", ["config", "user.name", "Release Test"], {
    cwd: seedDirectory,
  });
  run("git", ["config", "user.email", "release@example.invalid"], {
    cwd: seedDirectory,
  });
  writeFileSync(
    join(seedDirectory, "package.json"),
    `${JSON.stringify({
      name: packageName,
      version: packageVersion,
      repository: {
        type: "git",
        url: "git+https://github.com/t4dhg/medical-device-symbols.git",
      },
    })}\n`,
  );
  run("git", ["add", "package.json"], { cwd: seedDirectory });
  run("git", ["commit", "-m", "fixture"], { cwd: seedDirectory });
  const fixtureCommit = run("git", ["rev-parse", "HEAD"], {
    cwd: seedDirectory,
  });
  run("git", ["tag", "-a", tag, "-m", tag], { cwd: seedDirectory });
  run("git", ["remote", "add", "origin", originDirectory], {
    cwd: seedDirectory,
  });
  run("git", ["push", "origin", "master", `refs/tags/${tag}`], {
    cwd: seedDirectory,
  });
  run("git", [
    "clone",
    ...(shallow ? ["--depth", "1"] : []),
    pathToFileURL(originDirectory).href,
    directory,
  ]);
  run("git", ["config", "user.name", "Release Test"], { cwd: directory });
  run("git", ["config", "user.email", "release@example.invalid"], {
    cwd: directory,
  });
  run(
    "git",
    [
      "remote",
      "set-url",
      "origin",
      "https://github.com/t4dhg/medical-device-symbols.git",
    ],
    { cwd: directory },
  );
  const subprocessCalls = [];
  return {
    directory,
    originDirectory,
    seedDirectory,
    commit: fixtureCommit,
    subprocessCalls,
    subprocess(baseRunner) {
      return (command, args, options = {}) => {
        subprocessCalls.push([command, ...args]);
        if (command !== "git" || args[0] !== "fetch") {
          return baseRunner(command, args, options);
        }
        return baseRunner(command, args, {
          ...options,
          env: {
            ...process.env,
            GIT_CONFIG_COUNT: "1",
            GIT_CONFIG_KEY_0: `url.${pathToFileURL(originDirectory).href}.insteadOf`,
            GIT_CONFIG_VALUE_0:
              "https://github.com/t4dhg/medical-device-symbols.git",
          },
        });
      };
    },
  };
}

function advanceOriginMaster(fixture) {
  const marker = "later";
  writeFileSync(join(fixture.seedDirectory, marker), `${marker}\n`);
  run("git", ["add", marker], { cwd: fixture.seedDirectory });
  run("git", ["commit", "-m", marker], { cwd: fixture.seedDirectory });
  const advanced = run("git", ["rev-parse", "HEAD"], {
    cwd: fixture.seedDirectory,
  });
  run("git", ["push", "origin", "master"], {
    cwd: fixture.seedDirectory,
  });
  return advanced;
}

function replaceOriginMasterWithUnrelated(fixture) {
  run("git", ["checkout", "--orphan", "unrelated"], {
    cwd: fixture.seedDirectory,
  });
  run("git", ["rm", "-rf", "."], { cwd: fixture.seedDirectory });
  writeFileSync(
    join(fixture.seedDirectory, "package.json"),
    `${JSON.stringify({
      name: packageName,
      version: packageVersion,
      repository: {
        type: "git",
        url: "git+https://github.com/t4dhg/medical-device-symbols.git",
      },
    })}\n`,
  );
  writeFileSync(join(fixture.seedDirectory, "unrelated"), "unrelated\n");
  run("git", ["add", "package.json", "unrelated"], {
    cwd: fixture.seedDirectory,
  });
  run("git", ["commit", "-m", "unrelated"], {
    cwd: fixture.seedDirectory,
  });
  const unrelated = run("git", ["rev-parse", "HEAD"], {
    cwd: fixture.seedDirectory,
  });
  run("git", ["push", "--force", "origin", "HEAD:master"], {
    cwd: fixture.seedDirectory,
  });
  return unrelated;
}

function releaseEnvironment(fixtureCommit, overrides = {}) {
  return {
    GITHUB_EVENT_NAME: "push",
    GITHUB_REPOSITORY: "t4dhg/medical-device-symbols",
    GITHUB_REF: `refs/tags/${tag}`,
    GITHUB_REF_NAME: tag,
    GITHUB_REF_TYPE: "tag",
    GITHUB_SHA: fixtureCommit,
    ...overrides,
  };
}

function getPackFixture() {
  if (packFixture) return packFixture;
  const directory = temporaryRoot("medical-symbols-release-pack-");
  const cacheDirectory = join(directory, "npm-cache");
  mkdirSync(cacheDirectory);
  const reportPath = join(directory, "pack-report.json");
  const stdout = run(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", directory],
    {
      cwd: root,
      env: { ...process.env, npm_config_cache: cacheDirectory },
    },
  );
  writeFileSync(reportPath, `${stdout}\n`);
  const report = JSON.parse(stdout);
  assert.equal(report.length, 1);
  packFixture = {
    reportPath,
    tarballPath: join(directory, report[0].filename),
  };
  return packFixture;
}

async function createBundle() {
  const release = await loadReleaseModule();
  const fixture = getPackFixture();
  const bundleDirectory = join(temporaryRoot(), "bundle");
  release.prepareReleaseBundle({
    repositoryRoot: root,
    bundleDirectory,
    packReportPath: fixture.reportPath,
    tarballPath: fixture.tarballPath,
    tag,
    commit,
  });
  return { release, bundleDirectory };
}

function registryMetadata(overrides = {}) {
  return {
    name: packageName,
    version: packageVersion,
    dist: {
      integrity: "sha512-placeholder",
      tarball: expectedTarballUrl,
    },
    ...overrides,
  };
}

function provenanceStatement(sha512Hex) {
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [
      {
        name: `pkg:npm/${packageName}@${packageVersion}`,
        digest: { sha512: sha512Hex },
      },
    ],
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType:
          "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
        externalParameters: {
          workflow: {
            ref: `refs/tags/${tag}`,
            repository: "https://github.com/t4dhg/medical-device-symbols",
            path: ".github/workflows/release.yml",
          },
        },
        internalParameters: { github: { event_name: "push" } },
        resolvedDependencies: [
          {
            uri: `git+https://github.com/t4dhg/medical-device-symbols@refs/tags/${tag}`,
            digest: { gitCommit: commit },
          },
        ],
      },
      runDetails: {
        builder: {
          id: "https://github.com/actions/runner/github-hosted",
        },
      },
    },
  };
}

function auditFixture(sha512Hex, statement = provenanceStatement(sha512Hex)) {
  return {
    invalid: [],
    missing: [],
    verified: [
      {
        name: packageName,
        version: packageVersion,
        location: `node_modules/${packageName}`,
        registry: "https://registry.npmjs.org/",
        attestations: {
          provenance: { predicateType: "https://slsa.dev/provenance/v1" },
        },
        attestationBundles: [
          {
            predicateType: "https://slsa.dev/provenance/v1",
            bundle: {
              dsseEnvelope: {
                payloadType: "application/vnd.in-toto+json",
                payload: Buffer.from(JSON.stringify(statement)).toString(
                  "base64",
                ),
                signatures: [{ sig: "verified-by-npm" }],
              },
            },
          },
        ],
      },
    ],
  };
}

function validateWorkflowSemantics(workflow) {
  assert.deepEqual(workflow.on, { push: { tags: ["v*"] } });
  const { prepare, publish, "github-release": githubRelease } = workflow.jobs;
  const identity = (step) => step.name ?? step.uses;
  assert.deepEqual(prepare.steps.map(identity), [
    "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
    "Bind the annotated tag to fresh master",
    "Install the pinned publication client",
    "Install reviewed dependencies",
    "Run the complete quality gate",
    "Pack and verify the release archive",
    "Bind independent release-file hashes",
    "Upload the reviewed release bundle",
  ]);
  assert.deepEqual(publish.steps.map(identity), [
    "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
    "Download the reviewed bundle by artifact ID",
    "Bind and validate the downloaded bundle",
    "Install the pinned publication client",
    "Classify the exact registry version",
    "Publish the exact reviewed archive",
    "Prove registry bytes, signatures, and provenance",
  ]);
  assert.deepEqual(githubRelease.steps.map(identity), [
    "Verify the annotated tag and create or recover the release",
  ]);
  const checkout = prepare.steps[0];
  assert.deepEqual(checkout.with, {
    "fetch-depth": 0,
    "persist-credentials": false,
  });
  assert.deepEqual(prepare.outputs, {
    "artifact-id": "${{ steps.upload.outputs.artifact-id }}",
    "artifact-digest": "${{ steps.upload.outputs.artifact-digest }}",
    "manifest-sha256": "${{ steps.bind.outputs.manifest-sha256 }}",
    "verifier-sha256": "${{ steps.bind.outputs.verifier-sha256 }}",
    commit: "${{ steps.preflight.outputs.commit }}",
    tag: "${{ steps.preflight.outputs.tag }}",
  });
  const download = publish.steps[1];
  assert.equal(
    download.with["artifact-ids"],
    "${{ needs.prepare.outputs.artifact-id }}",
  );
  const bind = publish.steps[2];
  assert.deepEqual(bind.env, {
    EXPECTED_ARTIFACT_DIGEST: "${{ needs.prepare.outputs.artifact-digest }}",
    EXPECTED_MANIFEST_SHA256: "${{ needs.prepare.outputs.manifest-sha256 }}",
    EXPECTED_VERIFIER_SHA256: "${{ needs.prepare.outputs.verifier-sha256 }}",
    RELEASE_COMMIT: "${{ needs.prepare.outputs.commit }}",
    RELEASE_TAG: "${{ needs.prepare.outputs.tag }}",
  });
  assert.deepEqual(
    publish.steps
      .filter((step) => step["continue-on-error"] !== undefined)
      .map((step) => [step.id, step["continue-on-error"]]),
    [["publish", true]],
  );
  assert.equal(
    publish.steps[5].if,
    "${{ steps.registry.outputs.state == 'missing' }}",
  );
  assert.equal(publish.steps[6].if, "${{ success() }}");
}

function readStepOutputs(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        assert.ok(separator > 0, `invalid step output: ${line}`);
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function runPublishJob({
  sourceBundle,
  fakeRoot,
  environment,
  downloadFailure = false,
  artifactDigest = "ab".repeat(32),
  manifestSha256,
  verifierSha256,
  mutateDownloadedBundle = () => {},
}) {
  const workflow = parse(readFileSync(workflowPath, "utf8"));
  const steps = workflow.jobs.publish.steps;
  const runnerBundle = join(fakeRoot, "release-bundle");
  const outputs = {};
  const executions = [];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const label = step.name ?? step.uses;
    if (step.uses?.startsWith("actions/setup-node@")) {
      executions.push({ label, status: 0, simulated: "setup-node" });
      continue;
    }
    if (step.uses?.startsWith("actions/download-artifact@")) {
      if (downloadFailure) {
        executions.push({ label, status: 1, simulated: "download" });
        return { status: 1, failureStep: label, executions, outputs };
      }
      cpSync(sourceBundle, runnerBundle, { recursive: true });
      mutateDownloadedBundle(runnerBundle);
      executions.push({ label, status: 0, simulated: "download" });
      continue;
    }
    if (step.id === "publish" && outputs.registry?.state !== "missing") {
      executions.push({ label, status: 0, skipped: true });
      continue;
    }
    const outputPath = join(fakeRoot, `step-${index}-output`);
    const stepEnvironment = {
      ...process.env,
      ...environment,
      GITHUB_OUTPUT: outputPath,
      GITHUB_REF_NAME: tag,
      RUNNER_TEMP: fakeRoot,
    };
    for (const key of [
      "NODE_AUTH_TOKEN",
      "NPM_TOKEN",
      "GH_TOKEN",
      "GITHUB_TOKEN",
    ]) {
      delete stepEnvironment[key];
    }
    if (step.name === "Bind and validate the downloaded bundle") {
      stepEnvironment.EXPECTED_ARTIFACT_DIGEST = artifactDigest;
      stepEnvironment.EXPECTED_MANIFEST_SHA256 =
        manifestSha256 ??
        fileSha256(join(runnerBundle, "release-manifest.json"));
      stepEnvironment.EXPECTED_VERIFIER_SHA256 =
        verifierSha256 ?? fileSha256(join(runnerBundle, "check-release.mjs"));
      stepEnvironment.RELEASE_COMMIT = commit;
      stepEnvironment.RELEASE_TAG = tag;
    }
    if (step.id === "publish") {
      stepEnvironment.NODE_AUTH_TOKEN = "npm_secret_value";
      stepEnvironment.NPM_TOKEN = "npm_legacy_secret";
      stepEnvironment.GH_TOKEN = "github_cli_secret";
      stepEnvironment.GITHUB_TOKEN = "github_actions_secret";
    }
    const result = spawnSync("bash", ["-c", step.run], {
      cwd: fakeRoot,
      encoding: "utf8",
      env: stepEnvironment,
    });
    executions.push({
      label,
      id: step.id,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
    if (step.id) outputs[step.id] = readStepOutputs(outputPath);
    if (result.status !== 0 && step["continue-on-error"] !== true) {
      return {
        status: result.status,
        failureStep: label,
        executions,
        outputs,
      };
    }
  }
  return { status: 0, executions, outputs };
}

test("stable release tags accept canonical SemVer only", async () => {
  const { validateStableTag } = await loadReleaseModule();
  assert.equal(validateStableTag("v0.0.0"), "0.0.0");
  assert.equal(validateStableTag("v12.34.56"), "12.34.56");
  for (const value of [
    "2.2.0",
    "v02.2.0",
    "v2.02.0",
    "v2.2.00",
    "v2.2",
    "v2.2.0-rc.1",
    "v2.2.0+build",
    "v2.2.0\n",
  ]) {
    assert.throws(() => validateStableTag(value), /stable release tag/u);
  }
});

test("runSubprocess never uses a shell and fails closed on process uncertainty", async () => {
  const { runSubprocess } = await loadReleaseModule();
  const directory = temporaryRoot();
  const recorder = join(directory, "recorder.cjs");
  writeFileSync(
    recorder,
    `require("node:fs").writeFileSync(process.argv[2], JSON.stringify(process.argv.slice(3)));\n`,
  );
  const output = join(directory, "args.json");
  runSubprocess(process.execPath, [recorder, output, "$(touch owned)", "a;b"]);
  assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), [
    "$(touch owned)",
    "a;b",
  ]);
  assert.equal(lstatSync(directory).isDirectory(), true);
  assert.throws(
    () => runSubprocess(join(directory, "missing"), []),
    /could not spawn/u,
  );
  assert.throws(
    () =>
      runSubprocess(process.execPath, [
        "-e",
        "process.kill(process.pid, 'SIGTERM')",
      ]),
    /signal SIGTERM/u,
  );
  assert.throws(
    () => runSubprocess(process.execPath, ["-e", "process.exit(7)"]),
    /status 7/u,
  );
});

test("preflight always fetches exact fresh master before checking ancestry", async () => {
  const { preflightRelease, runSubprocess } = await loadReleaseModule();
  const fixture = createGitFixture();
  const advanced = advanceOriginMaster(fixture);
  const result = preflightRelease({
    repositoryRoot: fixture.directory,
    environment: releaseEnvironment(fixture.commit),
    subprocess: fixture.subprocess(runSubprocess),
  });
  assert.deepEqual(result, {
    name: packageName,
    version: packageVersion,
    tag,
    commit: fixture.commit,
  });
  assert.equal(
    run("git", ["rev-parse", "refs/remotes/origin/master"], {
      cwd: fixture.directory,
    }),
    advanced,
  );
  const fetch = fixture.subprocessCalls.findIndex(
    (call) => call[0] === "git" && call[1] === "fetch",
  );
  const ancestry = fixture.subprocessCalls.findIndex(
    (call) => call[0] === "git" && call[1] === "merge-base",
  );
  assert.deepEqual(fixture.subprocessCalls[fetch], [
    "git",
    "fetch",
    "--no-tags",
    "origin",
    "refs/heads/master:refs/remotes/origin/master",
  ]);
  assert.ok(fetch >= 0 && ancestry > fetch);
});

test("preflight rejects every event and repository identity mismatch", async () => {
  const { preflightRelease, runSubprocess } = await loadReleaseModule();
  const fixture = createGitFixture();
  for (const overrides of [
    { GITHUB_EVENT_NAME: "workflow_dispatch" },
    { GITHUB_REPOSITORY: "attacker/medical-device-symbols" },
    { GITHUB_REF: "refs/tags/v2.2.1" },
    { GITHUB_REF_NAME: "v2.2.1" },
    { GITHUB_REF_TYPE: "branch" },
    { GITHUB_SHA: "f".repeat(40) },
  ]) {
    assert.throws(
      () =>
        preflightRelease({
          repositoryRoot: fixture.directory,
          environment: releaseEnvironment(fixture.commit, overrides),
          subprocess: fixture.subprocess(runSubprocess),
        }),
      /release preflight/u,
    );
  }
});

test("preflight rejects lightweight tags and wrong origins", async () => {
  const { preflightRelease, runSubprocess } = await loadReleaseModule();
  const lightweight = createGitFixture();
  run("git", ["tag", "-d", tag], { cwd: lightweight.directory });
  run("git", ["tag", tag], { cwd: lightweight.directory });
  assert.throws(
    () =>
      preflightRelease({
        repositoryRoot: lightweight.directory,
        environment: releaseEnvironment(lightweight.commit),
        subprocess: lightweight.subprocess(runSubprocess),
      }),
    /annotated/u,
  );

  const wrongOrigin = createGitFixture();
  run(
    "git",
    ["remote", "set-url", "origin", "https://github.com/attacker/repo.git"],
    {
      cwd: wrongOrigin.directory,
    },
  );
  assert.throws(
    () =>
      preflightRelease({
        repositoryRoot: wrongOrigin.directory,
        environment: releaseEnvironment(wrongOrigin.commit),
        subprocess: wrongOrigin.subprocess(runSubprocess),
      }),
    /origin/u,
  );
});

test("preflight rejects a true shallow file clone", async () => {
  const { preflightRelease, runSubprocess } = await loadReleaseModule();
  const shallow = createGitFixture({ shallow: true });
  assert.equal(
    run("git", ["rev-parse", "--is-shallow-repository"], {
      cwd: shallow.directory,
    }),
    "true",
  );
  assert.throws(
    () =>
      preflightRelease({
        repositoryRoot: shallow.directory,
        environment: releaseEnvironment(shallow.commit),
        subprocess: shallow.subprocess(runSubprocess),
      }),
    /shallow/u,
  );
});

test("preflight refuses a missing fresh master ref", async () => {
  const { preflightRelease, runSubprocess } = await loadReleaseModule();
  const missing = createGitFixture();
  run("git", [
    "--git-dir",
    missing.originDirectory,
    "update-ref",
    "-d",
    "refs/heads/master",
  ]);
  assert.throws(
    () =>
      preflightRelease({
        repositoryRoot: missing.directory,
        environment: releaseEnvironment(missing.commit),
        subprocess: missing.subprocess(runSubprocess),
      }),
    /release preflight|fetch/u,
  );
});

test("preflight refuses a freshly fetched non-ancestor master", async () => {
  const { preflightRelease, runSubprocess } = await loadReleaseModule();
  const unrelated = createGitFixture();
  replaceOriginMasterWithUnrelated(unrelated);
  assert.throws(
    () =>
      preflightRelease({
        repositoryRoot: unrelated.directory,
        environment: releaseEnvironment(unrelated.commit),
        subprocess: unrelated.subprocess(runSubprocess),
      }),
    /release preflight|fetch|ancestor/u,
  );
});

test("preflight rejects a real event commit that differs from the tag peel", async () => {
  const { preflightRelease, runSubprocess } = await loadReleaseModule();
  const fixture = createGitFixture();
  writeFileSync(join(fixture.directory, "local-later"), "later\n");
  run("git", ["add", "local-later"], { cwd: fixture.directory });
  run("git", ["commit", "-m", "local later"], { cwd: fixture.directory });
  const later = run("git", ["rev-parse", "HEAD"], {
    cwd: fixture.directory,
  });
  assert.throws(
    () =>
      preflightRelease({
        repositoryRoot: fixture.directory,
        environment: releaseEnvironment(later),
        subprocess: fixture.subprocess(runSubprocess),
      }),
    /tag, event SHA, and peeled commit differ/u,
  );
});

test("release bundle preserves the reviewed tarball and has an exact self-verifying schema", async () => {
  const { release, bundleDirectory } = await createBundle();
  const manifest = release.validateReleaseBundle({
    bundleDirectory,
    expectedTag: tag,
    expectedCommit: commit,
  });
  assert.deepEqual(readdirSync(bundleDirectory).sort(), [
    "check-release.mjs",
    `${packageName}-${packageVersion}.tgz`,
    "release-manifest.json",
  ]);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.tag, tag);
  assert.equal(manifest.commit, commit);
  assert.deepEqual(manifest.files, [
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README.md",
    "lib/index.d.mts",
    "lib/index.d.ts",
    "lib/index.js",
    "lib/index.mjs",
    "package.json",
  ]);
  assert.deepEqual(
    readFileSync(join(bundleDirectory, manifest.tarball)),
    readFileSync(getPackFixture().tarballPath),
  );
});

test("release bundle rejects additions, symlinks, hash drift, identity drift, and verifier substitution", async () => {
  const { release, bundleDirectory } = await createBundle();
  const pristine = temporaryRoot();
  cpSync(bundleDirectory, pristine, { recursive: true });
  const mutations = [
    (directory) => writeFileSync(join(directory, "extra"), "unexpected"),
    (directory) => {
      rmSync(join(directory, "check-release.mjs"));
      symlinkSync(releaseScript, join(directory, "check-release.mjs"));
    },
    (directory) =>
      writeFileSync(
        join(directory, `${packageName}-${packageVersion}.tgz`),
        "not the reviewed archive",
      ),
    (directory) => {
      const path = join(directory, "release-manifest.json");
      const manifest = JSON.parse(readFileSync(path, "utf8"));
      manifest.version = "2.2.1";
      writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    },
    (directory) =>
      writeFileSync(join(directory, "check-release.mjs"), "// substituted\n"),
  ];
  for (const mutate of mutations) {
    const directory = temporaryRoot();
    cpSync(pristine, directory, { recursive: true });
    mutate(directory);
    assert.throws(
      () =>
        release.validateReleaseBundle({
          bundleDirectory: directory,
          expectedTag: tag,
          expectedCommit: commit,
        }),
      /release bundle/u,
    );
  }
});

test("standalone bundle validation rejects a checksum-valid nonempty USTAR prefix", async () => {
  const { release, bundleDirectory } = await createBundle();
  const manifest = JSON.parse(
    readFileSync(join(bundleDirectory, "release-manifest.json"), "utf8"),
  );
  const mutated = addRecomputedUstarPrefix(
    readFileSync(join(bundleDirectory, manifest.tarball)),
  );
  rebindBundleTarball(bundleDirectory, mutated);
  assert.throws(
    () =>
      release.validateReleaseBundle({
        bundleDirectory,
        expectedTag: tag,
        expectedCommit: commit,
      }),
    /USTAR prefix/u,
  );
});

test("registry view recognizes only the exact npm 11.19.0 missing response", async () => {
  const { classifyRegistryView } = await loadReleaseModule();
  const detail = `'${packageName}@${packageVersion}' is not in this registry.\n\nNote that you can also install from a\ntarball, folder, http url, or git url.`;
  const missing = {
    status: 1,
    signal: null,
    stdout: "",
    stderr: JSON.stringify({
      error: {
        code: "E404",
        summary: `No match found for version ${packageVersion}`,
        detail,
      },
    }),
  };
  assert.deepEqual(classifyRegistryView(missing, packageName, packageVersion), {
    state: "missing",
  });

  for (const mutate of [
    (value) => (value.status = 0),
    (value) => (value.signal = "SIGTERM"),
    (value) => (value.stderr = `noise\n${value.stderr}`),
    (value) => {
      const body = JSON.parse(value.stderr);
      body.error.code = "E403";
      value.stderr = JSON.stringify(body);
    },
    (value) => {
      const body = JSON.parse(value.stderr);
      body.error.summary = "No match found for version 2.2.1";
      value.stderr = JSON.stringify(body);
    },
    (value) => {
      const body = JSON.parse(value.stderr);
      body.error.detail += "\n";
      value.stderr = JSON.stringify(body);
    },
  ]) {
    const value = structuredClone(missing);
    mutate(value);
    assert.throws(
      () => classifyRegistryView(value, packageName, packageVersion),
      /registry response/u,
    );
  }
});

test("registry view accepts exact metadata and rejects near or malformed identities", async () => {
  const { classifyRegistryView } = await loadReleaseModule();
  const result = {
    status: 0,
    signal: null,
    stdout: JSON.stringify(registryMetadata()),
    stderr: "",
  };
  assert.deepEqual(classifyRegistryView(result, packageName, packageVersion), {
    state: "existing",
    metadata: registryMetadata(),
  });
  for (const stdout of [
    "noise\n" + result.stdout,
    "{}",
    JSON.stringify(registryMetadata({ name: `${packageName}-typo` })),
    JSON.stringify(registryMetadata({ version: "2.2.1" })),
    JSON.stringify(
      registryMetadata({
        dist: {
          integrity: "sha512-placeholder",
          tarball: "https://example.invalid/package.tgz",
        },
      }),
    ),
  ]) {
    assert.throws(
      () =>
        classifyRegistryView(
          { ...result, stdout },
          packageName,
          packageVersion,
        ),
      /registry response/u,
    );
  }
});

test("registry tarball validation binds downloaded bytes, SRI, package, and latest", async () => {
  const { validateRegistryTarball } = await loadReleaseModule();
  const bytes = readFileSync(getPackFixture().tarballPath);
  const { createHash } = require("node:crypto");
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  const metadata = registryMetadata({
    dist: { integrity, tarball: expectedTarballUrl },
  });
  assert.doesNotThrow(() =>
    validateRegistryTarball({
      metadata,
      downloadedTarball: bytes,
      reviewedTarball: bytes,
      name: packageName,
      version: packageVersion,
      latest: packageVersion,
    }),
  );
  for (const changes of [
    { downloadedTarball: Buffer.from("different") },
    { reviewedTarball: Buffer.from("different") },
    { latest: "2.1.9" },
    { metadata: { ...metadata, name: `${packageName}-other` } },
    { metadata: { ...metadata, version: "2.2.1" } },
    {
      metadata: {
        ...metadata,
        dist: { ...metadata.dist, integrity: "sha512-invalid" },
      },
    },
  ]) {
    assert.throws(
      () =>
        validateRegistryTarball({
          metadata,
          downloadedTarball: bytes,
          reviewedTarball: bytes,
          name: packageName,
          version: packageVersion,
          latest: packageVersion,
          ...changes,
        }),
      /registry tarball/u,
    );
  }
});

test("registry polling refuses a missing release unless latest is strictly older", async () => {
  const { pollRegistry } = await loadReleaseModule();
  const states = [
    { state: "missing" },
    { state: "existing", metadata: registryMetadata() },
  ];
  let index = 0;
  assert.deepEqual(
    await pollRegistry({
      name: packageName,
      version: packageVersion,
      latest: "2.1.9",
      attempts: 2,
      inspect: async () => states[index++],
      wait: async () => {},
    }),
    states[1],
  );
  for (const latest of [packageVersion, "2.2.1", "latest", undefined]) {
    await assert.rejects(
      pollRegistry({
        name: packageName,
        version: packageVersion,
        latest,
        attempts: 1,
        inspect: async () => ({ state: "missing" }),
        wait: async () => {},
      }),
      /latest/u,
    );
  }
  assert.deepEqual(
    await pollRegistry({
      name: packageName,
      version: "9007199254740993.0.0",
      latest: "9007199254740992.0.0",
      attempts: 1,
      inspect: async () => ({ state: "existing" }),
      wait: async () => {},
    }),
    { state: "existing" },
  );
});

test("signature validation locates exactly one verified release target", async () => {
  const { validateAuditSignatures } = await loadReleaseModule();
  const sha512Hex = "ab".repeat(64);
  const audit = auditFixture(sha512Hex);
  const verified = validateAuditSignatures(audit, packageName, packageVersion);
  assert.equal(verified.name, packageName);
  for (const mutate of [
    (value) => value.invalid.push({ name: packageName }),
    (value) => value.missing.push({ name: packageName }),
    (value) => value.verified.push(structuredClone(value.verified[0])),
    (value) => (value.verified[0].version = "2.2.1"),
    (value) => (value.verified[0].attestationBundles = []),
  ]) {
    const value = structuredClone(audit);
    mutate(value);
    assert.throws(
      () => validateAuditSignatures(value, packageName, packageVersion),
      /audit signatures/u,
    );
  }
});

test("provenance binds purl, digest, repository, workflow, tag, event, commit, and builder", async () => {
  const { validateProvenance } = await loadReleaseModule();
  const sha512Hex = "ab".repeat(64);
  const verified = auditFixture(sha512Hex).verified[0];
  assert.doesNotThrow(() =>
    validateProvenance(verified, {
      name: packageName,
      version: packageVersion,
      tag,
      commit,
      sha512: sha512Hex,
    }),
  );
  assert.throws(
    () =>
      validateProvenance(undefined, {
        name: packageName,
        version: packageVersion,
        tag,
        commit,
        sha512: sha512Hex,
      }),
    /provenance/u,
  );
  const mutations = [
    (value) => (value.subject[0].name = "pkg:npm/other@2.2.0"),
    (value) => (value.subject[0].digest.sha512 = "cd".repeat(64)),
    (value) =>
      (value.predicate.buildDefinition.externalParameters.workflow.repository =
        "https://github.com/attacker/repo"),
    (value) =>
      (value.predicate.buildDefinition.externalParameters.workflow.path =
        ".github/workflows/other.yml"),
    (value) =>
      (value.predicate.buildDefinition.externalParameters.workflow.ref =
        "refs/heads/master"),
    (value) =>
      (value.predicate.buildDefinition.internalParameters.github.event_name =
        "workflow_dispatch"),
    (value) =>
      (value.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit =
        "f".repeat(40)),
    (value) =>
      (value.predicate.runDetails.builder.id =
        "https://github.com/actions/runner/self-hosted"),
  ];
  for (const mutate of mutations) {
    const statement = provenanceStatement(sha512Hex);
    mutate(statement);
    const candidate = auditFixture(sha512Hex, statement).verified[0];
    assert.throws(
      () =>
        validateProvenance(candidate, {
          name: packageName,
          version: packageVersion,
          tag,
          commit,
          sha512: sha512Hex,
        }),
      /provenance/u,
    );
  }
});

test("release workflow has exactly three least-privilege, hash-bound jobs", () => {
  const workflow = parse(readFileSync(workflowPath, "utf8"));
  validateWorkflowSemantics(workflow);
  assert.deepEqual(workflow.permissions, {});
  assert.deepEqual(Object.keys(workflow.jobs), [
    "prepare",
    "publish",
    "github-release",
  ]);
  const { prepare, publish, "github-release": githubRelease } = workflow.jobs;
  assert.deepEqual(prepare.permissions, { contents: "read" });
  assert.deepEqual(publish.permissions, { "id-token": "write" });
  assert.deepEqual(githubRelease.permissions, { contents: "write" });
  assert.equal(publish.environment, "npm-publish");
  assert.equal(publish.needs, "prepare");
  assert.deepEqual(githubRelease.needs, ["prepare", "publish"]);
  assert.deepEqual(publish.concurrency, {
    group: "medical-device-symbols-npm-publish",
    "cancel-in-progress": false,
  });

  const uses = (job) => job.steps.filter((step) => step.uses);
  assert.deepEqual(
    uses(prepare).map((step) => step.uses),
    [
      "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
      "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
    ],
  );
  assert.deepEqual(
    uses(publish).map((step) => step.uses),
    [
      "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
      "actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c",
    ],
  );
  assert.deepEqual(uses(githubRelease), []);
  assert.equal(
    publish.steps.some((step) => step.uses?.startsWith("actions/checkout@")),
    false,
  );
  const setupPublish = publish.steps.find((step) =>
    step.uses?.startsWith("actions/setup-node@"),
  );
  assert.deepEqual(setupPublish.with, {
    "node-version": 24,
    "package-manager-cache": false,
  });
  const publishSource = publish.steps.map((step) => step.run ?? "").join("\n");
  assert.match(publishSource, /npm@11\.19\.0/u);
  assert.match(
    publishSource,
    /env -u NODE_AUTH_TOKEN -u NPM_TOKEN -u GH_TOKEN -u GITHUB_TOKEN npm publish/u,
  );
  assert.match(
    publishSource,
    /--ignore-scripts --access public --tag latest --provenance --registry https:\/\/registry\.npmjs\.org/u,
  );
  assert.equal(
    publish.steps.find((step) => step.id === "publish")?.["continue-on-error"],
    true,
  );
  assert.equal(
    publish.steps.find((step) => step.id === "verify-registry")?.if,
    "${{ success() }}",
  );
  assert.doesNotMatch(JSON.stringify(publish), /registry-url/u);
  assert.doesNotMatch(
    JSON.stringify(publish),
    /npm ci|npm install (?!-g\b|--global\b)|npm run/u,
  );
  assert.match(JSON.stringify(prepare), /npm ci --ignore-scripts/u);
  assert.match(JSON.stringify(prepare), /npm run verify/u);
  assert.match(JSON.stringify(prepare), /npm pack --json --ignore-scripts/u);
  assert.match(JSON.stringify(prepare), /--tarball/u);
  const upload = prepare.steps.find((step) =>
    step.uses?.startsWith("actions/upload-artifact@"),
  );
  assert.equal(upload.with["retention-days"], 1);
  assert.equal(upload.with["compression-level"], 0);
  assert.equal(upload.with["if-no-files-found"], "error");
  assert.equal(upload.with.overwrite, false);
  assert.equal(upload.with["include-hidden-files"], false);
  const download = publish.steps.find((step) =>
    step.uses?.startsWith("actions/download-artifact@"),
  );
  assert.equal(
    download.with["artifact-ids"],
    "${{ needs.prepare.outputs.artifact-id }}",
  );
  assert.equal(download.with["merge-multiple"], true);
  assert.equal(download.with["digest-mismatch"], "error");
  const githubSource = githubRelease.steps
    .map((step) => step.run ?? "")
    .join("\n");
  assert.match(githubSource, /git\/ref\/tags/u);
  assert.match(githubSource, /git\/tags/u);
  assert.match(githubSource, /gh release create/u);
  assert.match(githubSource, /--verify-tag --generate-notes/u);
  assert.match(githubSource, /draft/u);
  assert.match(githubSource, /prerelease/u);
  assert.deepEqual(githubRelease.env, { GH_TOKEN: "${{ github.token }}" });
});

test("workflow semantics reject trigger, order, history, output, and binding drift", () => {
  const source = readFileSync(workflowPath, "utf8");
  const mutations = [
    (workflow) => (workflow.on.push.tags = ["v**"]),
    (workflow) =>
      workflow.jobs.prepare.steps.splice(
        2,
        2,
        workflow.jobs.prepare.steps[3],
        workflow.jobs.prepare.steps[2],
      ),
    (workflow) => (workflow.jobs.prepare.steps[0].with["fetch-depth"] = 1),
    (workflow) => delete workflow.jobs.prepare.outputs["artifact-id"],
    (workflow) => delete workflow.jobs.prepare.outputs["artifact-digest"],
    (workflow) => delete workflow.jobs.prepare.outputs["manifest-sha256"],
    (workflow) => delete workflow.jobs.prepare.outputs["verifier-sha256"],
    (workflow) => delete workflow.jobs.prepare.outputs.commit,
    (workflow) => delete workflow.jobs.prepare.outputs.tag,
    (workflow) =>
      (workflow.jobs.publish.steps[1].with["artifact-ids"] =
        "${{ needs.prepare.outputs.artifact-digest }}"),
    (workflow) =>
      (workflow.jobs.publish.steps[2].env.EXPECTED_ARTIFACT_DIGEST =
        "${{ needs.prepare.outputs.manifest-sha256 }}"),
    (workflow) =>
      (workflow.jobs.publish.steps[2].env.EXPECTED_MANIFEST_SHA256 =
        "${{ needs.prepare.outputs.verifier-sha256 }}"),
    (workflow) =>
      (workflow.jobs.publish.steps[2].env.EXPECTED_VERIFIER_SHA256 =
        "${{ needs.prepare.outputs.manifest-sha256 }}"),
    (workflow) =>
      (workflow.jobs.publish.steps[2].env.RELEASE_COMMIT = "${{ github.sha }}"),
    (workflow) =>
      (workflow.jobs.publish.steps[2].env.RELEASE_TAG =
        "${{ github.ref_name }}"),
    (workflow) => (workflow.jobs.publish.steps[4]["continue-on-error"] = true),
    (workflow) => delete workflow.jobs.publish.steps[5]["continue-on-error"],
    (workflow) => (workflow.jobs.publish.steps[6].if = "${{ always() }}"),
  ];
  for (const mutate of mutations) {
    const workflow = parse(source);
    mutate(workflow);
    assert.throws(() => validateWorkflowSemantics(workflow));
  }
});

test("the registry CLI uses fake npm without leaking token-shaped variables", async () => {
  const { bundleDirectory } = await createBundle();
  const fakeRoot = temporaryRoot("medical-symbols-release-fake-npm-");
  const fakeNpm = join(fakeRoot, "npm");
  const log = join(fakeRoot, "npm-log.jsonl");
  const sourceTarball = getPackFixture().tarballPath;
  writeExecutable(
    fakeNpm,
    `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const entry = { args: process.argv.slice(2), tokens: { NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN, NPM_TOKEN: process.env.NPM_TOKEN, GH_TOKEN: process.env.GH_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN } };
fs.appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(entry) + "\\n");
const args = process.argv.slice(2);
const metadata = JSON.parse(process.env.FAKE_METADATA);
if (args[0] === "view" && args[1] === "medical-device-symbols" && args.includes("dist-tags.latest")) process.stdout.write(JSON.stringify(metadata["dist-tags"].latest));
else if (args[0] === "view" && args.includes("--json")) process.stdout.write(JSON.stringify(metadata));
else if (args[0] === "pack") { const report = JSON.parse(process.env.FAKE_PACK_REPORT); const destination = args[args.indexOf("--pack-destination") + 1]; const target = path.join(destination, path.basename(report[0].filename)); fs.copyFileSync(process.env.FAKE_TARBALL, target); process.stdout.write(process.env.FAKE_PACK_REPORT); }
else process.exit(97);
`,
  );
  const bytes = readFileSync(sourceTarball);
  const { createHash } = require("node:crypto");
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  const result = spawnSync(
    process.execPath,
    [releaseScript, "registry-state", "--bundle", bundleDirectory],
    {
      cwd: fakeRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${fakeRoot}:${process.env.PATH}`,
        FAKE_NPM_LOG: log,
        FAKE_TARBALL: sourceTarball,
        FAKE_PACK_REPORT: JSON.stringify([
          {
            name: packageName,
            version: packageVersion,
            filename: `${packageName}-${packageVersion}.tgz`,
          },
        ]),
        FAKE_METADATA: JSON.stringify(
          registryMetadata({
            dist: { integrity, tarball: expectedTarballUrl },
            "dist-tags": { latest: packageVersion },
          }),
        ),
        NODE_AUTH_TOKEN: "npm_secret_value",
        NPM_TOKEN: "npm_legacy_secret",
        GH_TOKEN: "github_cli_secret",
        GITHUB_TOKEN: "github_actions_secret",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { state: "existing" });
  const entries = readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  assert.ok(entries.length >= 2);
  for (const entry of entries) {
    assert.deepEqual(entry.tokens, {});
  }

  const rejectedReports = [];
  for (const scenario of [
    {
      name: "wrong name",
      report: [
        {
          name: `${packageName}-other`,
          version: packageVersion,
          filename: `${packageName}-${packageVersion}.tgz`,
        },
      ],
    },
    {
      name: "wrong version",
      report: [
        {
          name: packageName,
          version: "2.2.1",
          filename: `${packageName}-${packageVersion}.tgz`,
        },
      ],
    },
    {
      name: "wrong filename",
      report: [
        { name: packageName, version: packageVersion, filename: "other.tgz" },
      ],
    },
    {
      name: "path filename",
      report: [
        {
          name: packageName,
          version: packageVersion,
          filename: `subdir/${packageName}-${packageVersion}.tgz`,
        },
      ],
    },
    {
      name: "suffix filename",
      report: [
        {
          name: packageName,
          version: packageVersion,
          filename: `${packageName}-${packageVersion}.tgz.backup`,
        },
      ],
    },
    {
      name: "near-version filename",
      report: [
        {
          name: packageName,
          version: packageVersion,
          filename: `${packageName}-2.2.1.tgz`,
        },
      ],
    },
  ]) {
    const rejected = spawnSync(
      process.execPath,
      [releaseScript, "registry-state", "--bundle", bundleDirectory],
      {
        cwd: fakeRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${fakeRoot}:${process.env.PATH}`,
          FAKE_NPM_LOG: log,
          FAKE_TARBALL: sourceTarball,
          FAKE_PACK_REPORT: JSON.stringify(scenario.report),
          FAKE_METADATA: JSON.stringify(
            registryMetadata({
              dist: { integrity, tarball: expectedTarballUrl },
              "dist-tags": { latest: packageVersion },
            }),
          ),
        },
      },
    );
    rejectedReports.push({
      name: scenario.name,
      report: scenario.report,
      status: rejected.status,
      stderr: rejected.stderr,
    });
  }
  for (const rejected of rejectedReports) {
    assert.notEqual(rejected.status, 0, rejected.name);
    assert.match(rejected.stderr, /registry tarball/u, rejected.name);
  }
});

test("the registry verifier installs, locks, audits, and proves the exact published target", async () => {
  const { bundleDirectory } = await createBundle();
  const manifest = JSON.parse(
    readFileSync(join(bundleDirectory, "release-manifest.json"), "utf8"),
  );
  const fakeRoot = temporaryRoot("medical-symbols-release-fake-verify-");
  const fakeNpm = join(fakeRoot, "npm");
  const log = join(fakeRoot, "npm-log.jsonl");
  const viewCount = join(fakeRoot, "view-count");
  const publishMarker = join(fakeRoot, "published");
  const runnerBundle = join(fakeRoot, "release-bundle");
  const sourceTarball = join(bundleDirectory, manifest.tarball);
  const metadata = registryMetadata({
    dist: {
      integrity: manifest.integrity,
      tarball: expectedTarballUrl,
    },
  });
  const audit = auditFixture(manifest.sha512);
  writeExecutable(
    fakeNpm,
    `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const entry = { args, tokens: { NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN, NPM_TOKEN: process.env.NPM_TOKEN, GH_TOKEN: process.env.GH_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN } };
fs.appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(entry) + "\\n");
if (args[0] === "--version") process.stdout.write("11.19.0\\n");
else if (args[0] === "install" && args.includes("--global")) {}
else if (args[0] === "view" && args[1] === "medical-device-symbols" && args.includes("dist-tags.latest")) { const count = Number(fs.readFileSync(process.env.FAKE_VIEW_COUNT, "utf8")); process.stdout.write(JSON.stringify(count < 2 ? "2.1.9" : ${JSON.stringify(packageVersion)})); }
else if (args[0] === "view") { const count = fs.existsSync(process.env.FAKE_VIEW_COUNT) ? Number(fs.readFileSync(process.env.FAKE_VIEW_COUNT, "utf8")) + 1 : 1; fs.writeFileSync(process.env.FAKE_VIEW_COUNT, String(count)); if (count === 1) { process.stderr.write(JSON.stringify({ error: { code: "E404", summary: "No match found for version 2.2.0", detail: "'medical-device-symbols@2.2.0' is not in this registry.\\n\\nNote that you can also install from a\\ntarball, folder, http url, or git url." } })); process.exit(1); } process.stdout.write(process.env.FAKE_METADATA); }
else if (args[0] === "pack") { const destination = args[args.indexOf("--pack-destination") + 1]; const target = path.join(destination, path.basename(process.env.FAKE_TARBALL)); fs.copyFileSync(process.env.FAKE_TARBALL, target); process.stdout.write(JSON.stringify([{ name: ${JSON.stringify(packageName)}, version: ${JSON.stringify(packageVersion)}, filename: path.basename(target) }])); }
else if (args[0] === "publish") { fs.writeFileSync(process.env.FAKE_PUBLISH_MARKER, "published"); process.exit(73); }
else if (args[0] === "install") { fs.mkdirSync(path.join(process.cwd(), "node_modules", ${JSON.stringify(packageName)}), { recursive: true }); fs.writeFileSync(path.join(process.cwd(), "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { ["node_modules/" + ${JSON.stringify(packageName)}]: { version: ${JSON.stringify(packageVersion)}, resolved: ${JSON.stringify(expectedTarballUrl)}, integrity: process.env.FAKE_INTEGRITY } } })); }
else if (args[0] === "audit" && args[1] === "signatures") process.stdout.write(process.env.FAKE_AUDIT);
else process.exit(97);
`,
  );
  const fakeEnvironment = {
    ...process.env,
    PATH: `${fakeRoot}:${process.env.PATH}`,
    FAKE_NPM_LOG: log,
    FAKE_VIEW_COUNT: viewCount,
    FAKE_PUBLISH_MARKER: publishMarker,
    FAKE_TARBALL: sourceTarball,
    FAKE_METADATA: JSON.stringify(metadata),
    FAKE_INTEGRITY: manifest.integrity,
    FAKE_AUDIT: JSON.stringify(audit),
  };
  const result = await runPublishJob({
    sourceBundle: bundleDirectory,
    fakeRoot,
    environment: fakeEnvironment,
  });
  assert.equal(
    result.status,
    0,
    JSON.stringify(
      {
        executions: result.executions,
        npm: existsSync(log) ? readFileSync(log, "utf8") : "not called",
      },
      null,
      2,
    ),
  );
  const publishExecution = result.executions.find(
    (entry) => entry.id === "publish",
  );
  assert.equal(publishExecution.status, 73);
  const verificationExecution = result.executions.find(
    (entry) => entry.id === "verify-registry",
  );
  assert.equal(verificationExecution.status, 0);
  assert.deepEqual(JSON.parse(verificationExecution.stdout), {
    state: "verified",
  });
  assert.ok(
    result.executions.indexOf(verificationExecution) >
      result.executions.indexOf(publishExecution),
  );
  for (const execution of result.executions) {
    if (execution === publishExecution) continue;
    assert.equal(execution.status, 0, execution.label);
  }
  assert.equal(readFileSync(publishMarker, "utf8"), "published");
  const entries = readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(
    entries.filter(
      (entry) =>
        entry.args[0] === "view" &&
        entry.args[1] === `${packageName}@${packageVersion}`,
    ).length,
    2,
  );
  for (const entry of entries) assert.deepEqual(entry.tokens, {});
  const publishEntry = entries.find((entry) => entry.args[0] === "publish");
  assert.deepEqual(publishEntry.args, [
    "publish",
    join(runnerBundle, manifest.tarball),
    "--ignore-scripts",
    "--access",
    "public",
    "--tag",
    "latest",
    "--provenance",
    "--registry",
    "https://registry.npmjs.org",
  ]);
  const install = entries.find(
    (entry) => entry.args[0] === "install" && !entry.args.includes("--global"),
  );
  assert.deepEqual(install.args.slice(0, 4), [
    "install",
    `${packageName}@${packageVersion}`,
    "--ignore-scripts",
    "--omit=peer",
  ]);
  const auditEntry = entries.find(
    (entry) => entry.args[0] === "audit" && entry.args[1] === "signatures",
  );
  assert.deepEqual(auditEntry.args, [
    "audit",
    "signatures",
    "--json",
    "--include-attestations",
  ]);
});

test("GitHub Release shell recovers an indeterminate create only from exact post-state", () => {
  const workflow = parse(readFileSync(workflowPath, "utf8"));
  const releaseStep = workflow.jobs["github-release"].steps.find(
    (step) =>
      step.name ===
      "Verify the annotated tag and create or recover the release",
  );
  const fakeRoot = temporaryRoot("medical-symbols-release-fake-gh-");
  const fakeGh = join(fakeRoot, "gh");
  const log = join(fakeRoot, "gh-log.jsonl");
  const marker = join(fakeRoot, "created");
  writeExecutable(
    fakeGh,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify({ args, tokens: { NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN, NPM_TOKEN: process.env.NPM_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN, GH_TOKEN: process.env.GH_TOKEN } }) + "\\n");
const endpoint = args.at(-1);
if (args[0] === "api" && endpoint.includes("/git/ref/tags/")) process.stdout.write(JSON.stringify({ object: { type: "tag", sha: "a".repeat(40) } }));
else if (args[0] === "api" && endpoint.includes("/git/tags/")) process.stdout.write(JSON.stringify({ object: { type: "commit", sha: process.env.RELEASE_COMMIT } }));
else if (args[0] === "api" && endpoint.includes("/releases/tags/") && args.includes("--include")) { const exists = fs.existsSync(process.env.FAKE_GH_MARKER); process.stdout.write("HTTP/2.0 " + (exists ? "200 OK" : "404 Not Found") + "\\ncontent-type: application/json\\n\\n" + JSON.stringify(exists ? { tag_name: process.env.RELEASE_TAG, name: process.env.RELEASE_TAG, draft: false, prerelease: false } : { message: "Not Found" })); process.exit(exists ? 0 : 1); }
else if (args[0] === "release" && args[1] === "create") { const repo = args.indexOf("--repo"); if (repo < 0 || args[repo + 1] !== process.env.GITHUB_REPOSITORY) process.exit(98); fs.writeFileSync(process.env.FAKE_GH_MARKER, "created"); process.exit(73); }
else if (args[0] === "api" && endpoint.includes("/releases/tags/") && fs.existsSync(process.env.FAKE_GH_MARKER)) process.stdout.write(JSON.stringify({ tag_name: process.env.RELEASE_TAG, name: process.env.RELEASE_TAG, draft: false, prerelease: false }));
else process.exit(97);
`,
  );
  const result = spawnSync("bash", ["-c", releaseStep.run], {
    cwd: fakeRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeRoot}:${process.env.PATH}`,
      RUNNER_TEMP: fakeRoot,
      GITHUB_REPOSITORY: "t4dhg/medical-device-symbols",
      RELEASE_COMMIT: commit,
      RELEASE_TAG: tag,
      FAKE_GH_LOG: log,
      FAKE_GH_MARKER: marker,
      NODE_AUTH_TOKEN: "npm_secret_value",
      NPM_TOKEN: "npm_legacy_secret",
      GITHUB_TOKEN: "legacy_github_secret",
      GH_TOKEN: "ephemeral_job_token",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(marker, "utf8"), "created");
  const entries = readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  for (const entry of entries) {
    assert.deepEqual(entry.tokens, { GH_TOKEN: "ephemeral_job_token" });
  }
  const create = entries.find(
    (entry) => entry.args[0] === "release" && entry.args[1] === "create",
  );
  assert.deepEqual(create.args, [
    "release",
    "create",
    tag,
    "--verify-tag",
    "--generate-notes",
    "--title",
    tag,
    "--repo",
    "t4dhg/medical-device-symbols",
  ]);
  assert.equal(
    entries.filter(
      (entry) =>
        entry.args[0] === "api" &&
        entry.args.at(-1).includes("/releases/tags/"),
    ).length,
    2,
  );
});

test("publish prerequisites fail before registry classification, publication, or verification", async () => {
  const cases = [
    {
      name: "download failure",
      options: { downloadFailure: true },
      failureStep: "Download the reviewed bundle by artifact ID",
    },
    {
      name: "artifact digest binding mismatch",
      options: { artifactDigest: "not-a-sha256-digest" },
      failureStep: "Bind and validate the downloaded bundle",
    },
    {
      name: "manifest hash mismatch",
      options: { manifestSha256: "00".repeat(32) },
      failureStep: "Bind and validate the downloaded bundle",
    },
    {
      name: "verifier hash mismatch",
      options: { verifierSha256: "00".repeat(32) },
      failureStep: "Bind and validate the downloaded bundle",
    },
    {
      name: "bundle validation failure",
      options: {
        mutateDownloadedBundle: (directory) =>
          writeFileSync(join(directory, "release-manifest.json"), "{}\n"),
      },
      failureStep: "Bind and validate the downloaded bundle",
    },
  ];
  const outcomes = [];
  for (const scenario of cases) {
    const { bundleDirectory } = await createBundle();
    const fakeRoot = temporaryRoot("medical-symbols-release-barrier-");
    const log = join(fakeRoot, "npm-called");
    writeExecutable(
      join(fakeRoot, "npm"),
      `#!/usr/bin/env node\nrequire("node:fs").appendFileSync(process.env.FAKE_NPM_CALLED, JSON.stringify(process.argv.slice(2)) + "\\n"); process.exit(97);\n`,
    );
    const result = await runPublishJob({
      sourceBundle: bundleDirectory,
      fakeRoot,
      environment: {
        PATH: `${fakeRoot}:${process.env.PATH}`,
        FAKE_NPM_CALLED: log,
      },
      ...scenario.options,
    });
    outcomes.push({ scenario, result, npmCalled: existsSync(log) });
  }
  for (const { scenario, result, npmCalled } of outcomes) {
    assert.notEqual(result.status, 0, scenario.name);
    assert.equal(
      result.failureStep,
      scenario.failureStep,
      `${scenario.name}: ${JSON.stringify(result.executions)}`,
    );
    assert.equal(npmCalled, false, scenario.name);
  }
});
