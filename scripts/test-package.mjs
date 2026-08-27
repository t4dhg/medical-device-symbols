#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseSuppliedTarballArgs,
  validatePackReport,
  validateTarball,
} from "./package-contract.mjs";
import { assertSpawnSucceeded, resolveNpmInvocation } from "./npm-command.mjs";

const REACT_VERSIONS = ["16.14.0", "17.0.2", "18.3.1", "19.2.8"];
const REACT_19_TOOLS = [
  "typescript@5.9.3",
  "@types/react@19.2.18",
  "@types/react-dom@19.2.5",
  "esbuild@0.28.2",
];
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptsDirectory, "..");
const expectedApi = JSON.parse(
  readFileSync(join(repositoryRoot, "test", "fixtures", "public-api.json"), "utf8"),
);

function invoke(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    shell: false,
    stdio: options.capture ? "pipe" : "inherit",
  });
  try {
    assertSpawnSucceeded(result, command, args);
  } catch (error) {
    if (options.capture) {
      const stdout = result.stdout ? `\nstdout:\n${result.stdout}` : "";
      const stderr = result.stderr ? `\nstderr:\n${result.stderr}` : "";
      error.message += `${stdout}${stderr}`;
    }
    throw error;
  }
  return result;
}

function npmRunner(cacheDirectory) {
  const { command, prefixArgs } = resolveNpmInvocation({
    platform: process.platform,
    execPath: process.execPath,
    npmExecPath: process.env.npm_execpath,
  });
  return (args, options = {}) =>
    invoke(command, [...prefixArgs, ...args], {
      ...options,
      env: {
        ...process.env,
        npm_config_cache: cacheDirectory,
      },
    });
}

function packOnce(root, runNpm) {
  const destination = join(root, "pack");
  mkdirSync(destination);
  const result = runNpm(
    [
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      destination,
    ],
    { cwd: repositoryRoot, capture: true },
  );
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error("npm pack did not return valid JSON", { cause: error });
  }
  assert.ok(Array.isArray(report) && report.length === 1);
  const tarball = join(destination, report[0].filename);
  validatePackReport(report, tarball);
  return tarball;
}

function assertInstalledPackageIsIsolated(consumerDirectory) {
  const installed = join(
    consumerDirectory,
    "node_modules",
    "medical-device-symbols",
  );
  const stats = lstatSync(installed);
  assert.equal(stats.isDirectory(), true, "installed package must be a directory");
  assert.equal(stats.isSymbolicLink(), false, "installed package must not be a symlink");
  const resolvedConsumer = realpathSync(consumerDirectory);
  const resolvedInstalled = realpathSync(installed);
  const fromConsumer = relative(resolvedConsumer, resolvedInstalled);
  assert.equal(isAbsolute(fromConsumer), false, "installed package escaped consumer root");
  assert.equal(
    fromConsumer === ".." || fromConsumer.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`),
    false,
    "installed package escaped consumer root",
  );
}

function runtimeSource(moduleFormat, reactVersion) {
  const expected = JSON.stringify(expectedApi);
  const reactDomServer = ["16.14.0", "17.0.2"].includes(reactVersion)
    ? "react-dom/server.js"
    : "react-dom/server";
  const load = moduleFormat === "cjs"
    ? `const React = require("react");\nconst { renderToStaticMarkup } = require("react-dom/server");\nconst api = require("medical-device-symbols");`
    : `import React from "react";\nimport ReactDOMServer from ${JSON.stringify(reactDomServer)};\nimport * as api from "medical-device-symbols";\nconst { renderToStaticMarkup } = ReactDOMServer;`;
  return `
${moduleFormat === "cjs" ? "const assert = require(\"node:assert/strict\");" : "import assert from \"node:assert/strict\";"}
${load}
const expected = ${expected};
const rootExports = [...expected.components, "ICON_NAMES", "icons"].sort();
assert.deepEqual(Object.keys(api).sort(), rootExports);
assert.deepEqual(Object.keys(api.icons).sort(), expected.components);
assert.deepEqual(api.ICON_NAMES, expected.iconNames);
const markup = renderToStaticMarkup(
  React.createElement(api.CautionIcon, { size: 32, title: expected.iconNames.CAUTION }),
);
assert.match(markup, /^<svg/);
assert.ok(markup.includes('aria-label="' + expected.iconNames.CAUTION + '"'));
assert.match(markup, /(?:width=['\"]32['\"]|width=\"32\")/);
`;
}

function runRuntimeConsumers(consumerDirectory, reactVersion) {
  const cjs = join(consumerDirectory, "consumer.cjs");
  const esm = join(consumerDirectory, "consumer.mjs");
  writeFileSync(cjs, runtimeSource("cjs", reactVersion));
  writeFileSync(esm, runtimeSource("esm", reactVersion));
  invoke(process.execPath, [cjs], { cwd: consumerDirectory });
  invoke(process.execPath, [esm], { cwd: consumerDirectory });
}

function runTypeConsumers(consumerDirectory) {
  const source = `import { CautionIcon, ICON_NAMES, type IconProps } from "medical-device-symbols";
const props: IconProps = { size: 32, title: ICON_NAMES.CAUTION };
void CautionIcon; void props;
`;
  writeFileSync(join(consumerDirectory, "consumer.mts"), source);
  writeFileSync(join(consumerDirectory, "consumer.cts"), source);
  writeFileSync(
    join(consumerDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          strict: true,
          noEmit: true,
        },
        files: ["consumer.mts", "consumer.cts"],
      },
      null,
      2,
    )}\n`,
  );
  const typescriptCli = join(
    consumerDirectory,
    "node_modules",
    "typescript",
    "lib",
    "tsc.js",
  );
  assert.equal(lstatSync(typescriptCli).isFile(), true);
  invoke(process.execPath, [typescriptCli, "-p", "tsconfig.json"], {
    cwd: consumerDirectory,
  });
}

function runTreeShakingConsumer(consumerDirectory) {
  const entry = join(consumerDirectory, "bundle-entry.mjs");
  const output = join(consumerDirectory, "bundle-output.mjs");
  writeFileSync(
    entry,
    `import { CautionIcon } from "medical-device-symbols";\nexport default CautionIcon;\n`,
  );
  const esbuildCli = join(
    consumerDirectory,
    "node_modules",
    "esbuild",
    "bin",
    "esbuild",
  );
  assert.equal(lstatSync(esbuildCli).isFile(), true);
  invoke(
    process.execPath,
    [
      esbuildCli,
      entry,
      "--bundle",
      "--format=esm",
      "--platform=neutral",
      "--tree-shaking=true",
      "--external:react",
      `--outfile=${output}`,
    ],
    { cwd: consumerDirectory },
  );
  const bundle = readFileSync(output, "utf8");
  assert.match(bundle, /CautionIcon/u);
  assert.match(bundle, /from\s+["']react["']/u);
  assert.doesNotMatch(bundle, /ManufacturerIcon/u);
  assert.doesNotMatch(bundle, /\bicons\b/u);
}

function verifyConsumer({ root, cacheDirectory, tarball, reactVersion, runNpm }) {
  const consumerDirectory = join(root, `react-${reactVersion}`);
  mkdirSync(consumerDirectory);
  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({
      name: `medical-symbols-consumer-react-${reactVersion}`,
      version: "1.0.0",
      private: true,
      type: "module",
    })}\n`,
  );
  const specs = [
    tarball,
    `react@${reactVersion}`,
    `react-dom@${reactVersion}`,
    ...(reactVersion === "19.2.8" ? REACT_19_TOOLS : []),
  ];
  runNpm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      cacheDirectory,
      ...specs,
    ],
    { cwd: consumerDirectory },
  );
  assertInstalledPackageIsIsolated(consumerDirectory);
  runNpm(["ls", "--all", "--cache", cacheDirectory], {
    cwd: consumerDirectory,
  });
  runRuntimeConsumers(consumerDirectory, reactVersion);
  if (reactVersion === "19.2.8") {
    runTypeConsumers(consumerDirectory);
    runTreeShakingConsumer(consumerDirectory);
  }
  console.log(`verified React ${reactVersion}: CJS and ESM SSR`);
}

async function main() {
  const suppliedTarball = parseSuppliedTarballArgs(process.argv.slice(2));
  const root = mkdtempSync(join(tmpdir(), "medical-device-symbols-consumers-"));
  try {
    const cacheDirectory = join(root, "npm-cache");
    mkdirSync(cacheDirectory);
    const runNpm = npmRunner(cacheDirectory);
    const tarball = suppliedTarball ?? packOnce(root, runNpm);
    validateTarball(readFileSync(tarball));
    for (const reactVersion of REACT_VERSIONS) {
      verifyConsumer({ root, cacheDirectory, tarball, reactVersion, runNpm });
    }
    console.log(`verified exact tarball across ${REACT_VERSIONS.length} isolated consumers`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
