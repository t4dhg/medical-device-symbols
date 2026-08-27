#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptsDirectory, "..");
const libDirectory = resolve(repositoryRoot, "lib");

function clean() {
  assert.equal(dirname(libDirectory), repositoryRoot);
  assert.equal(basename(libDirectory), "lib");
  rmSync(libDirectory, { recursive: true, force: true });
}

const arguments_ = process.argv.slice(2);
const cleanOnly =
  arguments_.length === 1 && arguments_[0] === "--clean-only";

if (arguments_.length > 0 && !cleanOnly) {
  throw new Error(`unknown argument ${JSON.stringify(arguments_[0])}`);
}

clean();

if (!cleanOnly) {
  process.chdir(repositoryRoot);

  await Promise.all([
    build({
      entryPoints: ["src/index.tsx"],
      outfile: "lib/index.js",
      bundle: true,
      format: "cjs",
      platform: "node",
      target: "node18",
      external: ["react"],
    }),
    build({
      entryPoints: ["src/index.tsx"],
      outfile: "lib/index.mjs",
      bundle: true,
      format: "esm",
      platform: "neutral",
      target: "es2018",
      external: ["react"],
    }),
  ]);

  const typescriptCli = require.resolve("typescript/lib/tsc.js");
  execFileSync(
    process.execPath,
    [typescriptCli, "-p", "tsconfig.build.json"],
    { stdio: "inherit" },
  );
  copyFileSync("lib/index.d.ts", "lib/index.d.mts");
}
