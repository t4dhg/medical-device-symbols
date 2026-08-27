const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const { parse } = require("yaml");

const root = join(__dirname, "..");
const privateReportUrl =
  "https://github.com/t4dhg/medical-device-symbols/security/advisories/new";
const discussionsUrl =
  "https://github.com/t4dhg/medical-device-symbols/discussions";

function readRequired(relativePath) {
  const absolutePath = join(root, relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} must exist`);
  return readFileSync(absolutePath, "utf8");
}

function parseRequiredYaml(relativePath) {
  const document = parse(readRequired(relativePath));
  assert.ok(document && typeof document === "object");
  return document;
}

function formFields(form) {
  assert.ok(Array.isArray(form.body));
  return form.body.filter((entry) => entry.id !== undefined);
}

function assertRequiredForm(relativePath, expected) {
  const form = parseRequiredYaml(relativePath);
  const fields = formFields(form);

  assert.equal(form.name, expected.name);
  assert.equal(form.description, expected.description);
  assert.equal(form.title, expected.title);
  assert.deepEqual(form.labels, expected.labels);
  assert.deepEqual(
    fields.map(({ id, type }) => ({ id, type })),
    expected.fields,
  );

  for (const field of fields) {
    assert.equal(
      field.validations?.required,
      true,
      `${relativePath} field ${field.id} must be required`,
    );
  }
}

function tableRows(source, expectedHeaders) {
  const lines = source.split("\n");
  const headerIndex = lines.findIndex((line) => {
    if (!line.startsWith("|")) return false;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    return JSON.stringify(cells) === JSON.stringify(expectedHeaders);
  });

  assert.notEqual(
    headerIndex,
    -1,
    `missing table: ${expectedHeaders.join(", ")}`,
  );
  assert.match(lines[headerIndex + 1] ?? "", /^\|(?:\s*:?-+:?\s*\|)+$/);

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("|")) break;
    rows.push(
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
  }
  return rows;
}

test("Dependabot groups non-major development updates and preserves the TypeScript exclusion", () => {
  const dependabot = parseRequiredYaml(".github/dependabot.yml");

  assert.equal(dependabot.version, 2);
  assert.deepEqual(
    dependabot.updates.map((update) => update["package-ecosystem"]).sort(),
    ["github-actions", "npm"],
  );

  const npm = dependabot.updates.find(
    (update) => update["package-ecosystem"] === "npm",
  );
  const actions = dependabot.updates.find(
    (update) => update["package-ecosystem"] === "github-actions",
  );
  for (const update of [npm, actions]) {
    assert.equal(update.directory, "/");
    assert.deepEqual(update.schedule, { interval: "weekly" });
  }

  assert.equal(npm["open-pull-requests-limit"], 5);
  assert.deepEqual(npm.groups, {
    "non-major-development-dependencies": {
      "dependency-type": "development",
      "update-types": ["minor", "patch"],
    },
  });
  assert.deepEqual(npm.ignore, [
    {
      "dependency-name": "typescript",
      "update-types": ["version-update:semver-major"],
    },
  ]);
});

test("bug reports collect every compatibility and release-impact field", () => {
  assertRequiredForm(".github/ISSUE_TEMPLATE/bug.yml", {
    name: "Bug report",
    description: "Report a reproducible problem with the package.",
    title: "[Bug]: ",
    labels: ["bug"],
    fields: [
      { id: "package_version", type: "input" },
      { id: "react_version", type: "input" },
      { id: "node_version", type: "input" },
      { id: "bundler_runtime", type: "input" },
      { id: "reproduction", type: "textarea" },
      { id: "expected_behavior", type: "textarea" },
      { id: "actual_behavior", type: "textarea" },
      { id: "logs", type: "textarea" },
      { id: "accessibility", type: "textarea" },
      { id: "compatibility", type: "textarea" },
      { id: "release_impact", type: "dropdown" },
    ],
  });
});

test("feature requests collect public-API, validation, and release-impact decisions", () => {
  assertRequiredForm(".github/ISSUE_TEMPLATE/feature.yml", {
    name: "Feature request",
    description: "Propose a focused improvement to the package.",
    title: "[Feature]: ",
    labels: ["enhancement"],
    fields: [
      { id: "problem", type: "textarea" },
      { id: "proposed_behavior", type: "textarea" },
      { id: "alternatives", type: "textarea" },
      { id: "public_api_impact", type: "textarea" },
      { id: "tests_documentation", type: "textarea" },
      { id: "release_impact", type: "dropdown" },
    ],
  });
});

test("the issue chooser disables blank issues and routes private and discussion traffic", () => {
  const chooser = parseRequiredYaml(".github/ISSUE_TEMPLATE/config.yml");

  assert.equal(chooser.blank_issues_enabled, false);
  assert.deepEqual(chooser.contact_links, [
    {
      name: "Report a security vulnerability",
      url: privateReportUrl,
      about: "Send vulnerability details privately to the maintainers.",
    },
    {
      name: "Ask a question",
      url: discussionsUrl,
      about: "Ask usage and support questions in GitHub Discussions.",
    },
  ]);
});

test("the pull request template requires reviewable scope and verification", () => {
  const pullRequest = readRequired(".github/pull_request_template.md");

  for (const heading of [
    "Summary",
    "Motivation and context",
    "Changes",
    "Testing",
    "Public API and compatibility",
    "Documentation",
    "Release impact",
    "Checklist",
  ]) {
    assert.match(pullRequest, new RegExp(`^## ${heading}$`, "m"));
  }

  for (const item of [
    "I ran `npm run verify` locally.",
    "I added or updated tests for behavior changes.",
    "I updated public documentation for user-facing changes.",
    "I described any public API or compatibility impact above.",
    "I updated `CHANGELOG.md` when the change affects users.",
    "I did not include credentials, private data, or generated build output.",
  ]) {
    assert.match(
      pullRequest,
      new RegExp(
        `^- \\[ \\] ${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "m",
      ),
    );
  }
});

test("conduct and security policies define private, promise-free reporting", () => {
  const conduct = readRequired("CODE_OF_CONDUCT.md");
  const security = readRequired("SECURITY.md");

  for (const pattern of [
    /respectful and constructive/i,
    /harassment/i,
    /personal attacks/i,
    /technical criticism.*work/is,
    /privacy/i,
    /maintainers?.*enforc/is,
  ]) {
    assert.match(conduct, pattern);
  }
  assert.match(conduct, new RegExp(privateReportUrl.replaceAll("/", "\\/")));

  assert.deepEqual(tableRows(security, ["Version", "Supported"]), [
    ["2.x", ":white_check_mark:"],
    ["< 2.0", ":x:"],
  ]);
  assert.match(security, /do not.*public.*(?:issue|discussion)/is);
  assert.match(security, new RegExp(privateReportUrl.replaceAll("/", "\\/")));
  assert.doesNotMatch(
    security,
    /(?:response|reply).{0,80}(?:within|in)\s+(?:a|an|\d+|few|several)\s+(?:business\s+)?(?:hours?|days?|weeks?)/is,
  );
});

test("dependency risk records the complete zero-finding audit snapshot", () => {
  const risk = readRequired("docs/DEPENDENCY_RISK.md");
  const rows = tableRows(risk, [
    "Finding",
    "Severity",
    "Dependency path",
    "Runtime reachability",
    "Fix availability",
    "Mitigation",
  ]);

  assert.ok(rows.length > 0, "dependency-risk table must not be empty");
  for (const row of rows) {
    assert.equal(row.length, 6);
    for (const cell of row) assert.notEqual(cell, "");
  }

  const snapshot = risk.match(/Audit date: `(\d{4}-\d{2}-\d{2})`/);
  assert.ok(snapshot, "dependency-risk record needs an ISO audit date");
  assert.equal(Number.isNaN(Date.parse(`${snapshot[1]}T00:00:00Z`)), false);
  assert.match(risk, /Command: `npm audit --json`/);
  assert.match(
    risk,
    /Result: `0 info, 0 low, 0 moderate, 0 high, 0 critical; 0 total`/,
  );
});

test("repository settings remain an exact proposal with no live-state claim", () => {
  const settings = readRequired("docs/REPOSITORY_SETTINGS.md");

  assert.match(
    settings,
    /^# Repository settings\n\n> \*\*Proposed — not yet applied\.\*\*/,
  );
  for (const term of [
    "quality",
    "refs/heads/master",
    "refs/tags/v*",
    "npm-publish",
    "private vulnerability reporting",
    "Dependabot security updates",
    "CodeQL",
  ]) {
    assert.match(
      settings,
      new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  }

  for (const term of [
    "require a pull request",
    "require linear history",
    "require conversation resolution",
    "block force pushes",
    "restrict deletions",
    "bypass list: none",
    "after GitHub records a successful `quality` check",
    "restrict updates",
    "do not restrict creations",
    "secret scanning",
    "push protection",
    "Dependabot alerts",
    "full-length commit SHA",
    "squash merging only",
    "automatically delete head branches",
    "enable GitHub Discussions",
    "owner: `t4dhg`",
    "repository: `medical-device-symbols`",
    "workflow: `release.yml`",
    "allowed action: `npm publish`",
    "deferred pending separate release implementation and separately authorized external execution",
  ]) {
    assert.match(
      settings,
      new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  }
});
