const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const { parse } = require("yaml");

const root = join(__dirname, "..");
const workflowPath = join(root, ".github", "workflows", "ci.yml");
const workflowSource = readFileSync(workflowPath, "utf8");
const ci = parse(workflowSource);
const verificationJob = ci.jobs["verify-node"];

test("CI has exact protected-branch triggers", () => {
  assert.equal(ci.name, "CI");
  assert.deepEqual(ci.on, {
    push: { branches: ["master"] },
    pull_request: { branches: ["master"] },
  });
});

test("CI grants only read access to repository contents", () => {
  assert.deepEqual(ci.permissions, { contents: "read" });
});

test("CI cancels superseded push and pull request runs", () => {
  assert.deepEqual(ci.concurrency, {
    group: "${{ github.workflow }}-${{ github.ref }}",
    "cancel-in-progress": true,
  });
});

test("CI exposes only the verification matrix and stable quality aggregate", () => {
  assert.deepEqual(Object.keys(ci.jobs).sort(), ["quality", "verify-node"]);
});

test("CI keeps running matrix entries after one verification failure", () => {
  assert.ok(verificationJob, "missing verification job");
  assert.equal(verificationJob.strategy["fail-fast"], false);
});

test("CI runs every supported Node version", () => {
  assert.ok(verificationJob, "missing verification job");
  assert.deepEqual(verificationJob.strategy.matrix.node, [18, 20, 22, 24]);
});

test("CI bounds every verification matrix entry to 30 minutes", () => {
  assert.ok(verificationJob, "missing verification job");
  assert.equal(verificationJob["runs-on"], "ubuntu-latest");
  assert.equal(verificationJob["timeout-minutes"], 30);
});

test("CI checks out without persisting credentials at the reviewed version", () => {
  assert.ok(verificationJob, "missing verification job");
  assert.deepEqual(verificationJob.steps[0], {
    uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    with: { "persist-credentials": false },
  });
  assert.match(
    workflowSource,
    /^\s*- uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1$/m,
  );
});

test("CI sets up matrix Node without package-manager caching", () => {
  assert.ok(verificationJob, "missing verification job");
  assert.deepEqual(verificationJob.steps[1], {
    uses: "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
    with: {
      "node-version": "${{ matrix.node }}",
      "package-manager-cache": false,
    },
  });
  assert.match(
    workflowSource,
    /^\s*- uses: actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7\.0\.0$/m,
  );
});

test("CI installs without lifecycle scripts and runs only the unified verifier", () => {
  assert.ok(verificationJob, "missing verification job");
  assert.deepEqual(
    verificationJob.steps.filter((step) => step.run).map((step) => step.run),
    ["npm ci --ignore-scripts", "npm run verify"],
  );
  assert.equal(verificationJob.steps.length, 4);
});

test("quality always evaluates and accepts only an exact successful dependency result", () => {
  const quality = ci.jobs.quality;
  assert.ok(quality, "missing stable quality aggregate");
  assert.equal(quality.name, "quality");
  assert.equal(quality["runs-on"], "ubuntu-latest");
  assert.equal(quality["timeout-minutes"], 5);
  assert.deepEqual(quality.needs, ["verify-node"]);
  assert.equal(quality.if, "${{ always() }}");
  assert.equal(quality.steps.length, 1);

  const [gate] = quality.steps;
  assert.equal(gate.shell, "bash");
  assert.deepEqual(gate.env, {
    VERIFY_NODE_RESULT: "${{ needs.verify-node.result }}",
  });

  for (const [result, expectedStatus] of [
    ["success", 0],
    ["failure", 1],
    ["cancelled", 1],
    ["skipped", 1],
    ["neutral", 1],
    ["", 1],
    ["success ", 1],
  ]) {
    const execution = spawnSync(
      "bash",
      ["-o", "errexit", "-o", "nounset", "-o", "pipefail", "-c", gate.run],
      {
        encoding: "utf8",
        env: { ...process.env, VERIFY_NODE_RESULT: result },
      },
    );

    assert.equal(execution.error, undefined);
    assert.equal(
      execution.status,
      expectedStatus,
      `quality returned ${execution.status} for ${JSON.stringify(result)}: ${execution.stderr}`,
    );
  }
});
