const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");

const modulePromise = import("../scripts/npm-command.mjs");

test("Windows npm invocation uses Node with an absolute existing npm-cli.js", async () => {
  const { resolveNpmInvocation } = await modulePromise;
  const directory = mkdtempSync(join(tmpdir(), "medical-symbols-npm-command-"));
  const npmCli = join(directory, "npm-cli.js");
  writeFileSync(npmCli, "");

  try {
    assert.deepEqual(
      resolveNpmInvocation({
        platform: "win32",
        execPath: "C:\\Program Files\\nodejs\\node.exe",
        npmExecPath: npmCli,
      }),
      {
        command: "C:\\Program Files\\nodejs\\node.exe",
        prefixArgs: [npmCli],
      },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("npm CLI validation rejects cmd shims, relative paths, and missing files", async () => {
  const { resolveNpmInvocation } = await modulePromise;
  const directory = mkdtempSync(join(tmpdir(), "medical-symbols-npm-command-"));
  const npmCmd = join(directory, "npm.cmd");
  const wrongBasename = join(directory, "not-npm.js");
  writeFileSync(npmCmd, "");
  writeFileSync(wrongBasename, "");

  try {
    for (const npmExecPath of [
      npmCmd,
      "node_modules/npm/bin/npm-cli.js",
      join(directory, "missing", "npm-cli.js"),
      wrongBasename,
    ]) {
      assert.throws(
        () =>
          resolveNpmInvocation({
            platform: "win32",
            execPath: "C:\\node.exe",
            npmExecPath,
          }),
        /npm-cli\.js|absolute|regular file/,
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("only POSIX may fall back to a direct npm executable", async () => {
  const { resolveNpmInvocation } = await modulePromise;
  assert.deepEqual(
    resolveNpmInvocation({
      platform: "linux",
      execPath: "/usr/bin/node",
      npmExecPath: undefined,
    }),
    { command: "npm", prefixArgs: [] },
  );
  assert.throws(
    () =>
      resolveNpmInvocation({
        platform: "win32",
        execPath: "C:\\node.exe",
        npmExecPath: undefined,
      }),
    /Windows.*npm-cli\.js/,
  );
});

test("spawn diagnostics distinguish errors, statuses, and signals", async () => {
  const { assertSpawnSucceeded } = await modulePromise;
  const spawnError = Object.assign(new Error("not found"), { code: "ENOENT" });

  assert.throws(
    () =>
      assertSpawnSucceeded(
        { error: spawnError, status: null, signal: null },
        "npm",
        ["install"],
      ),
    /could not spawn.*ENOENT.*not found/,
  );
  assert.throws(
    () =>
      assertSpawnSucceeded(
        { error: undefined, status: 7, signal: null },
        "npm",
        ["ls", "--all"],
      ),
    /exited with status 7/,
  );
  assert.throws(
    () =>
      assertSpawnSucceeded(
        { error: undefined, status: null, signal: "SIGTERM" },
        "npm",
        ["pack"],
      ),
    /terminated by signal SIGTERM/,
  );
  assert.doesNotThrow(() =>
    assertSpawnSucceeded({ error: undefined, status: 0, signal: null }, "npm", [
      "install",
    ]),
  );
});
