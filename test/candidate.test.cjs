const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const candidateVersion = "2.3.1";
const candidateHeading = "2.3.1 - 2026-08-29";
const publicationBoundary =
  "Finalized for the reviewed 2.3.1 release on 2026-08-29.";
const cdnPrefix = "https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@v";

function repositoryState() {
  return {
    packageJson: JSON.parse(readFileSync(join(root, "package.json"), "utf8")),
    packageLock: JSON.parse(
      readFileSync(join(root, "package-lock.json"), "utf8"),
    ),
    changelog: readFileSync(join(root, "CHANGELOG.md"), "utf8"),
    readme: readFileSync(join(root, "README.md"), "utf8"),
  };
}

function changelogSections(changelog) {
  const headings = [...changelog.matchAll(/^## ([^\r\n]+)$/gm)];
  return headings.map((heading, index) => ({
    heading: heading[1],
    body: changelog.slice(
      heading.index + heading[0].length,
      headings[index + 1]?.index ?? changelog.length,
    ),
  }));
}

function validateCandidateState({
  packageJson,
  packageLock,
  changelog,
  readme,
}) {
  assert.equal(packageJson.version, candidateVersion);
  assert.equal(packageLock.version, candidateVersion);
  assert.equal(packageLock.packages?.[""]?.version, candidateVersion);

  const forbiddenScript =
    /^(?:prepare|prepublish|prepublishOnly|publish|postpublish|preversion|version|postversion|deploy(?::|$)|publish(?::|$))/u;
  for (const scriptName of Object.keys(packageJson.scripts ?? {})) {
    assert.doesNotMatch(scriptName, forbiddenScript);
  }

  const sections = changelogSections(changelog);
  assert.equal(sections[0]?.heading, "[Unreleased]");
  assert.equal(sections[0]?.body.trim(), "No changes yet.");
  assert.equal(sections[1]?.heading, candidateHeading);
  assert.equal(
    sections[1]?.body.trimStart().split(/\r?\n\r?\n/u)[0],
    publicationBoundary,
  );
  assert.equal(sections[1]?.body.split(publicationBoundary).length - 1, 1);

  const candidateClaims = sections[1].body.replace(publicationBoundary, "");
  assert.doesNotMatch(candidateClaims, /\b(?:published|tagged)\b/iu);
  assert.doesNotMatch(
    candidateClaims,
    /(?:\bGitHub Release\b.{0,80}\b(?:available|created|exists|live)\b|\b(?:available|created|exists|live)\b.{0,80}\bGitHub Release\b)/isu,
  );

  const versionedCdnUrls = [
    ...readme.matchAll(
      /https:\/\/cdn\.jsdelivr\.net\/gh\/t4dhg\/medical-device-symbols@v([^/"\s]+)\/(assets\/banner\.png|src\/icons\/[^/"\s]+\.svg)/gu,
    ),
  ];
  assert.equal(versionedCdnUrls.length, 30);
  assert.equal(
    versionedCdnUrls.filter((match) => match[2] === "assets/banner.png").length,
    1,
  );
  assert.equal(
    versionedCdnUrls.filter((match) => match[2].startsWith("src/icons/"))
      .length,
    29,
  );
  for (const match of versionedCdnUrls) {
    assert.equal(match[1], candidateVersion);
  }
  assert.doesNotMatch(
    readme,
    new RegExp(
      `${cdnPrefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?!${candidateVersion.replaceAll(".", "\\.")}(?:/|\\b))`,
      "u",
    ),
  );
}

function validFixture() {
  const state = repositoryState();
  state.packageJson.version = candidateVersion;
  state.packageLock.version = candidateVersion;
  state.packageLock.packages[""].version = candidateVersion;
  state.changelog = `# Changelog

## [Unreleased]

No changes yet.

## ${candidateHeading}

${publicationBoundary}

### Changed

- Candidate changes.

## [2.2.0] - 2026-07-18

- Previous release.
`;
  state.readme = state.readme.replaceAll(
    "medical-device-symbols@v2.2.0",
    "medical-device-symbols@v2.3.1",
  );
  return state;
}

test("the repository is finalized for 2.3.1 without release lifecycle hooks", () => {
  validateCandidateState(repositoryState());
});

test("the finalized release contract accepts the complete intended state", () => {
  validateCandidateState(validFixture());
});

test("the candidate contract rejects every partial package and lockfile version update", () => {
  for (const mutate of [
    (state) => {
      state.packageJson.version = "2.2.0";
    },
    (state) => {
      state.packageLock.version = "2.2.0";
    },
    (state) => {
      state.packageLock.packages[""].version = "2.2.0";
    },
  ]) {
    const state = validFixture();
    mutate(state);
    assert.throws(() => validateCandidateState(state), assert.AssertionError);
  }
});

test("the finalized release contract rejects missing status or premature publication claims", () => {
  for (const replacement of [
    "This candidate is not yet published, tagged, or a GitHub Release.",
    "Version 2.3.1 is published, tagged, and a GitHub Release.",
    `${publicationBoundary}\n\nVersion 2.3.1 is published.`,
    `${publicationBoundary}\n\nVersion 2.3.1 is tagged.`,
    `${publicationBoundary}\n\nA GitHub Release is now available for version 2.3.1.`,
  ]) {
    const state = validFixture();
    state.changelog = state.changelog.replace(publicationBoundary, replacement);
    assert.throws(() => validateCandidateState(state), assert.AssertionError);
  }
});

test("the finalized release contract rejects a populated or misplaced Unreleased section", () => {
  for (const mutate of [
    (changelog) => changelog.replace("No changes yet.", "- A later change."),
    (changelog) =>
      changelog.replace(
        `## [Unreleased]\n\nNo changes yet.\n\n## ${candidateHeading}`,
        `## ${candidateHeading}\n\n${publicationBoundary}\n\n## [Unreleased]`,
      ),
    (changelog) =>
      changelog.replace(
        `## [Unreleased]\n\nNo changes yet.`,
        "## [Unreleased]\n\nNo changes yet.\n\n- An entry after the placeholder.",
      ),
  ]) {
    const state = validFixture();
    state.changelog = mutate(state.changelog);
    assert.throws(() => validateCandidateState(state), assert.AssertionError);
  }
});

test("the finalized release contract rejects stale banner and gallery versions independently", () => {
  for (const mutate of [
    (readme) =>
      readme.replace(
        `${cdnPrefix}2.3.1/assets/banner.png`,
        `${cdnPrefix}2.2.0/assets/banner.png`,
      ),
    (readme) =>
      readme.replace(
        `${cdnPrefix}2.3.1/src/icons/atmospheric-pressure-limitation.svg`,
        `${cdnPrefix}2.2.0/src/icons/atmospheric-pressure-limitation.svg`,
      ),
  ]) {
    const state = validFixture();
    state.readme = mutate(state.readme);
    assert.throws(() => validateCandidateState(state), assert.AssertionError);
  }
});

test("the finalized release contract rejects restored release lifecycle scripts", () => {
  for (const scriptName of [
    "prepare",
    "prepublishOnly",
    "publish",
    "postpublish",
    "preversion",
    "version",
    "postversion",
    "deploy",
    "deploy:patch",
    "publish:latest",
  ]) {
    const state = validFixture();
    state.packageJson.scripts[scriptName] = "exit 0";
    assert.throws(() => validateCandidateState(state), assert.AssertionError);
  }
});
