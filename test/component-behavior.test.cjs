const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { CautionIcon, icons } = require("../lib/index.js");

test("all public icon components retain React forwardRef identity", () => {
  for (const [name, component] of Object.entries(icons)) {
    assert.equal(
      component.$$typeof,
      Symbol.for("react.forward_ref"),
      `${name} is not forwardRef`,
    );
  }
});

test("an icon defaults to a 24 by 24 currentColor SVG", () => {
  const markup = renderToStaticMarkup(React.createElement(CautionIcon));

  assert.match(markup, /width="24"/);
  assert.match(markup, /height="24"/);
  assert.match(markup, /currentColor/);
});

test("an icon applies size, title accessibility, and forwarded SVG props", () => {
  const markup = renderToStaticMarkup(
    React.createElement(CautionIcon, {
      size: "2rem",
      title: "Caution",
      className: "label-icon",
      "data-testid": "caution",
    }),
  );

  assert.match(markup, /width="2rem"/);
  assert.match(markup, /height="2rem"/);
  assert.match(markup, /role="img"/);
  assert.match(markup, /aria-label="Caution"/);
  assert.match(markup, /class="label-icon"/);
  assert.match(markup, /data-testid="caution"/);
  assert.match(markup, /currentColor/);
});

test("explicit role and aria-label override title-derived accessibility props", () => {
  const markup = renderToStaticMarkup(
    React.createElement(CautionIcon, {
      title: "Caution",
      role: "presentation",
      "aria-label": "Explicit warning",
    }),
  );

  assert.match(markup, /role="presentation"/);
  assert.match(markup, /aria-label="Explicit warning"/);
  assert.doesNotMatch(markup, /aria-label="Caution"/);
});
