const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { once } = require("node:events");
const {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const { gzipSync } = require("node:zlib");
const esbuild = require("esbuild");

const root = join(__dirname, "..");
const runner = join(root, "scripts", "test-package.mjs");
const packageFiles = [
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

function writeTarString(header, offset, length, value) {
  const bytes = Buffer.from(value);
  assert.ok(bytes.length <= length);
  bytes.copy(header, offset);
}

function tarHeader(name, size) {
  const header = Buffer.alloc(512);
  writeTarString(header, 0, 100, name);
  writeTarString(header, 100, 8, "0000644\0");
  writeTarString(header, 108, 8, "0000000\0");
  writeTarString(header, 116, 8, "0000000\0");
  writeTarString(header, 124, 12, `${size.toString(8).padStart(11, "0")}\0`);
  writeTarString(header, 136, 12, "00000000000\0");
  header.fill(0x20, 148, 156);
  writeTarString(header, 156, 1, "0");
  writeTarString(header, 257, 6, "ustar\0");
  writeTarString(header, 263, 2, "00");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeTarString(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

function makeRepositoryTarball() {
  const chunks = [];
  for (const path of packageFiles) {
    const content = readFileSync(join(root, path));
    chunks.push(tarHeader(`package/${path}`, content.length), content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) chunks.push(Buffer.alloc(padding));
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks), { mtime: 0 });
}

function fakeNpmMain() {
  const { appendFileSync, mkdirSync, writeFileSync } = require("node:fs");
  const { dirname, join } = require("node:path");
  const { gunzipSync } = require("node:zlib");

  const args = process.argv.slice(2);
  appendFileSync(process.env.FAKE_NPM_RECORD, JSON.stringify(args) + "\n");
  if (args.includes("pack")) process.exit(97);

  const command = args.find(
    (argument) => argument === "install" || argument === "ls",
  );
  if (command === "ls") process.exit(0);
  if (command !== "install") process.exit(98);

  const tarball = args.find((argument) => argument.endsWith(".tgz"));
  const reactSpec = args.find((argument) => /^react@/.test(argument));
  if (!tarball || !reactSpec) process.exit(99);
  const reactVersion = reactSpec.slice("react@".length);
  const modules = join(process.cwd(), "node_modules");
  const packageRoot = join(modules, "medical-device-symbols");
  mkdirSync(packageRoot, { recursive: true });

  const archive = gunzipSync(require("node:fs").readFileSync(tarball));
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const nul = header.indexOf(0, 0);
    const name = header.subarray(0, nul === -1 ? 100 : nul).toString("utf8");
    const sizeText = header
      .subarray(124, 136)
      .toString("ascii")
      .replace(/[\0 ]+$/g, "");
    const size = Number.parseInt(sizeText || "0", 8);
    const contentStart = offset + 512;
    if (name.startsWith("package/")) {
      const destination = join(packageRoot, name.slice("package/".length));
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(
        destination,
        archive.subarray(contentStart, contentStart + size),
      );
    }
    offset = contentStart + Math.ceil(size / 512) * 512;
  }

  function writeModule(relative, source) {
    const destination = join(modules, relative);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, source);
  }

  writeModule(
    "react/package.json",
    JSON.stringify({ name: "react", version: reactVersion, main: "index.js" }),
  );
  writeModule(
    "react/index.js",
    String.raw`
function createElement(type, props, ...children) {
  return { type, props: { ...(props || {}), ...(children.length ? { children } : {}) } };
}
function forwardRef(render) {
  function ForwardRef(props) { return render(props || {}, null); }
  return ForwardRef;
}
module.exports = { createElement, forwardRef, version: ${JSON.stringify(reactVersion)} };
`,
  );
  writeModule(
    "react-dom/package.json",
    JSON.stringify({
      name: "react-dom",
      version: reactVersion,
      main: "index.js",
      ...(/^(?:18|19)\./.test(reactVersion)
        ? { exports: { ".": "./index.js", "./server": "./server.js" } }
        : {}),
    }),
  );
  writeModule("react-dom/index.js", "module.exports = {};\n");
  writeModule(
    "react-dom/server.js",
    String.raw`
function escape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/</g, "&lt;");
}
function renderToStaticMarkup(input) {
  let node = input;
  while (node && typeof node.type === "function") node = node.type(node.props || {});
  if (!node || node.type !== "svg") throw new Error("expected an svg element");
  const props = node.props || {};
  const attributes = Object.entries(props)
    .filter(([key]) => !["children", "dangerouslySetInnerHTML", "ref"].includes(key))
    .map(([key, value]) => " " + (key === "className" ? "class" : key) + "=\"" + escape(value) + "\"")
    .join("");
  return "<svg" + attributes + ">" + (props.dangerouslySetInnerHTML?.__html || "") + "</svg>";
}
const serverApi = {};
serverApi.renderToStaticMarkup = renderToStaticMarkup;
module.exports = serverApi;
`,
  );

  if (args.some((argument) => /^typescript@/.test(argument))) {
    writeModule(
      "typescript/package.json",
      JSON.stringify({ name: "typescript", version: "5.9.3" }),
    );
    writeModule("typescript/lib/tsc.js", "process.exit(0);\n");
    writeModule(
      "esbuild/package.json",
      JSON.stringify({ name: "esbuild", version: "0.28.2" }),
    );
    writeModule(
      "esbuild/bin/esbuild",
      String.raw`
const { writeFileSync } = require("node:fs");
const output = process.argv.slice(2).find((arg) => arg.startsWith("--outfile=")).slice("--outfile=".length);
writeFileSync(output, "import React from 'react';\nconst CautionIcon = true;\nexport { CautionIcon as default };\n");
`,
    );
  }
  if (process.env.FAKE_NPM_SIGNAL_PARENT) {
    writeFileSync(process.env.FAKE_NPM_ROOT_RECORD, dirname(process.cwd()));
    process.kill(process.ppid, process.env.FAKE_NPM_SIGNAL_PARENT);
  }
}

const fakeNpmSource = `(${fakeNpmMain.toString()})();\n`;

test("the built ESM entry tree-shakes unrelated icon initializers", () => {
  const result = esbuild.buildSync({
    stdin: {
      contents:
        'import { CautionIcon } from "medical-device-symbols"; export default CautionIcon;',
      resolveDir: root,
      sourcefile: "tree-shaking-consumer.mjs",
    },
    bundle: true,
    external: ["react"],
    format: "esm",
    platform: "neutral",
    treeShaking: true,
    write: false,
  });
  const bundle = result.outputFiles[0].text;
  assert.match(bundle, /CautionIcon/u);
  assert.doesNotMatch(bundle, /ManufacturerIcon/u);
  assert.doesNotMatch(bundle, /\bicons\b/u);
});

test("supplied mode runs the real consumer CLI without invoking npm pack", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "medical-symbols-supplied-mode-"),
  );
  const consumerTmp = join(directory, "consumer-tmp");
  const tarball = join(directory, "fixture.tgz");
  const fakeNpm = join(directory, "npm-cli.js");
  const record = join(directory, "npm-argv.jsonl");
  mkdirSync(consumerTmp);
  writeFileSync(tarball, makeRepositoryTarball());
  writeFileSync(fakeNpm, fakeNpmSource);
  writeFileSync(record, "");

  try {
    const result = spawnSync(process.execPath, [runner, "--tarball", tarball], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        FAKE_NPM_RECORD: record,
        TMPDIR: consumerTmp,
        npm_execpath: fakeNpm,
      },
      shell: false,
      timeout: 60_000,
    });
    assert.equal(
      result.status,
      0,
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    const calls = readFileSync(record, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.equal(
      calls.some((args) => args.includes("pack")),
      false,
    );
    assert.equal(calls.filter((args) => args.includes("install")).length, 4);
    assert.equal(calls.filter((args) => args.includes("ls")).length, 4);
    assert.deepEqual(readdirSync(consumerTmp), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test(
  "signalled runners remove their exact disposable root and preserve the signal",
  { timeout: 30_000 },
  async () => {
    for (const expectedSignal of ["SIGINT", "SIGTERM"]) {
      const directory = mkdtempSync(
        join(tmpdir(), "medical-symbols-signal-cleanup-"),
      );
      const consumerTmp = join(directory, "consumer-tmp");
      const tarball = join(directory, "fixture.tgz");
      const fakeNpm = join(directory, "npm-cli.js");
      const record = join(directory, "npm-argv.jsonl");
      const rootRecord = join(directory, "consumer-root.txt");
      mkdirSync(consumerTmp);
      writeFileSync(tarball, makeRepositoryTarball());
      writeFileSync(fakeNpm, fakeNpmSource);
      writeFileSync(record, "");

      let child;
      let timer;
      let stdout = "";
      let stderr = "";
      try {
        child = spawn(process.execPath, [runner, "--tarball", tarball], {
          cwd: root,
          env: {
            ...process.env,
            FAKE_NPM_RECORD: record,
            FAKE_NPM_ROOT_RECORD: rootRecord,
            FAKE_NPM_SIGNAL_PARENT: expectedSignal,
            TMPDIR: consumerTmp,
            npm_execpath: fakeNpm,
          },
          shell: false,
          stdio: "pipe",
        });
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        const completed = once(child, "close");
        const timedOut = new Promise((_, reject) => {
          timer = setTimeout(() => {
            child.kill("SIGKILL");
            reject(
              new Error(`runner did not terminate after ${expectedSignal}`),
            );
          }, 10_000);
        });
        const [code, signal] = await Promise.race([completed, timedOut]);
        clearTimeout(timer);
        timer = undefined;

        assert.equal(code, null, `stdout:\n${stdout}\nstderr:\n${stderr}`);
        assert.equal(signal, expectedSignal);
        const createdRoot = readFileSync(rootRecord, "utf8").trim();
        assert.equal(existsSync(createdRoot), false, `leaked ${createdRoot}`);
        assert.deepEqual(readdirSync(consumerTmp), []);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        if (child && child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
        rmSync(directory, { recursive: true, force: true });
      }
    }
  },
);
