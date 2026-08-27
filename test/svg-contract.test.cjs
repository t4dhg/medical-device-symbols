const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const contractModule = import("../scripts/lib/svg-contract.mjs");
const fixtures = join(__dirname, "fixtures", "svg");
const invalidFixtures = join(fixtures, "invalid");

test("a reviewed SVG is parsed into canonical embedded markup", async () => {
  const { parseSvgSource } = await contractModule;
  const source = readFileSync(join(fixtures, "valid-minimal.svg"), "utf8");

  assert.deepEqual(parseSvgSource(source, { filename: "valid-minimal.svg" }), {
    viewBox: "0 0 200 200",
    markup:
      '<g fill="none" stroke-width="3"><path d="M0 0" stroke="currentColor"/></g>' +
      '<rect fill="currentColor" height="10" width="10" x="1" y="2"/>',
  });
});

const invalidCases = [
  ["rejects a doctype", "doctype.svg", /DOCTYPE/i],
  ["rejects an entity declaration", "entity.svg", /entity/i],
  [
    "rejects a nonstandard processing instruction",
    "processing-instruction.svg",
    /processing instruction/i,
  ],
  [
    "rejects a non-exact XML declaration",
    "non-exact-xml-declaration.svg",
    /XML declaration/i,
  ],
  ["rejects nested SVG roots", "nested-svg.svg", /nested svg/i],
  ["rejects script", "script.svg", /script/i],
  ["rejects foreignObject", "foreign-object.svg", /foreignObject/i],
  ["rejects animation", "animate.svg", /animate/i],
  ["rejects links", "link-element.svg", /element.*a|a.*element/i],
  ["rejects event handlers", "event-handler.svg", /onload/i],
  ["rejects href", "href.svg", /href/i],
  ["rejects xlink:href", "xlink-href.svg", /xlink:href/i],
  ["rejects url functions", "url-function.svg", /url/i],
  ["rejects CSS imports", "css-import.svg", /@import/i],
  ["rejects unknown elements", "unknown-element.svg", /line/i],
  ["rejects unknown attributes", "unknown-attribute.svg", /data-unreviewed/i],
  ["rejects a missing viewBox", "missing-viewbox.svg", /viewBox/i],
  ["rejects an invalid viewBox", "invalid-viewbox.svg", /viewBox/i],
  [
    "rejects malformed viewBox separators",
    "malformed-viewbox-separators.svg",
    /viewBox/i,
  ],
  ["rejects malformed path data", "malformed-path-data.svg", /path data/i],
  [
    "rejects non-finite path numbers",
    "non-finite-path-number.svg",
    /path data/i,
  ],
  [
    "rejects malformed polygon points",
    "malformed-points.svg",
    /polygon points/i,
  ],
  [
    "rejects non-finite matrix values",
    "non-finite-matrix.svg",
    /transform/i,
  ],
  [
    "rejects non-finite drawing numbers",
    "non-finite-drawing-number.svg",
    /numeric/i,
  ],
  ["rejects a negative drawing width", "negative-width.svg", /width/i],
  ["rejects a negative drawing height", "negative-height.svg", /height/i],
  ["rejects a negative circle radius", "negative-radius.svg", /\br\b/i],
  ["rejects a negative x radius", "negative-rx.svg", /rx/i],
  ["rejects a negative y radius", "negative-ry.svg", /ry/i],
  [
    "rejects a negative stroke width",
    "negative-stroke-width.svg",
    /stroke-width/i,
  ],
  [
    "rejects non-finite root numbers",
    "non-finite-root-number.svg",
    /root width/i,
  ],
  ["rejects duplicate attributes", "duplicate-attribute.svg", /duplicate attribute/i],
  ["rejects unreviewed style text", "unreviewed-style.svg", /style/i],
  ["rejects drawing text", "text-content.svg", /text/i],
];

for (const [name, fixtureName, pattern] of invalidCases) {
  test(name, async () => {
    const { parseSvgSource } = await contractModule;
    const source = readFileSync(join(invalidFixtures, fixtureName), "utf8");

    assert.throws(
      () => parseSvgSource(source, { filename: "hostile.svg" }),
      pattern,
    );
  });
}
