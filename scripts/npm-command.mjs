import { lstatSync } from "node:fs";
import { basename, isAbsolute } from "node:path";

function validateNpmCli(npmExecPath) {
  if (typeof npmExecPath !== "string" || !isAbsolute(npmExecPath)) {
    throw new Error("npm executable must be an absolute npm-cli.js path");
  }
  if (basename(npmExecPath) !== "npm-cli.js") {
    throw new Error("npm executable basename must be npm-cli.js");
  }

  let stats;
  try {
    stats = lstatSync(npmExecPath);
  } catch {
    throw new Error(
      `npm-cli.js is not an existing regular file: ${npmExecPath}`,
    );
  }
  if (!stats.isFile()) {
    throw new Error(
      `npm-cli.js is not an existing regular file: ${npmExecPath}`,
    );
  }
}

export function resolveNpmInvocation({ platform, execPath, npmExecPath }) {
  if (npmExecPath !== undefined && npmExecPath !== "") {
    validateNpmCli(npmExecPath);
    return { command: execPath, prefixArgs: [npmExecPath] };
  }
  if (platform === "win32") {
    throw new Error(
      "Windows npm execution requires an absolute existing npm-cli.js",
    );
  }
  return { command: "npm", prefixArgs: [] };
}

function commandDescription(command, args) {
  return [command, ...args].map((part) => JSON.stringify(part)).join(" ");
}

export function assertSpawnSucceeded(result, command, args) {
  const description = commandDescription(command, args);
  if (result.error !== undefined) {
    const code =
      result.error.code === undefined ? "" : `${result.error.code}: `;
    throw new Error(
      `could not spawn ${description}: ${code}${result.error.message}`,
      { cause: result.error },
    );
  }
  if (result.signal !== null && result.signal !== undefined) {
    throw new Error(`${description} terminated by signal ${result.signal}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${description} exited with status ${String(result.status)}`,
    );
  }
}
