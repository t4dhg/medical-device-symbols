#!/usr/bin/env node

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeOrCheckGeneratedIndex } from "./lib/icon-generator.mjs";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptsDirectory, "..");

function parseArguments(arguments_) {
  const options = {
    check: false,
    iconsDirectory: join(repositoryRoot, "src", "icons"),
    outputFile: join(repositoryRoot, "src", "index.tsx"),
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--check") {
      options.check = true;
      continue;
    }
    if (argument === "--icons-directory" || argument === "--output-file") {
      const value = arguments_[index + 1];
      if (value === undefined) {
        throw new Error(`${argument} requires a path`);
      }
      index += 1;
      const key =
        argument === "--icons-directory" ? "iconsDirectory" : "outputFile";
      options[key] = resolve(value);
      continue;
    }
    throw new Error(`unknown argument ${JSON.stringify(argument)}`);
  }
  return options;
}

try {
  const options = parseArguments(process.argv.slice(2));
  writeOrCheckGeneratedIndex(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
