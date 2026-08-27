import { SaxesParser } from "saxes";

const EXACT_XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const REVIEWED_GALLERY_STYLE =
  "svg{fill:currentColor;color:#1f2328}@media(prefers-color-scheme:dark){svg{color:#e6edf3}}";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const NUMBER_SOURCE =
  "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const NUMBER = new RegExp(`^${NUMBER_SOURCE}$`);
const SVG_WHITESPACE_SOURCE = "[\\t\\n\\r ]";
const NUMBER_LIST = new RegExp(
  `^${SVG_WHITESPACE_SOURCE}*${NUMBER_SOURCE}(?:(?:${SVG_WHITESPACE_SOURCE}*,${SVG_WHITESPACE_SOURCE}*|${SVG_WHITESPACE_SOURCE}+)${NUMBER_SOURCE})*${SVG_WHITESPACE_SOURCE}*$`,
);
const NUMBER_TOKEN = new RegExp(NUMBER_SOURCE, "g");
const PATH_NUMBER = new RegExp(NUMBER_SOURCE, "y");
const PATH_COMMAND = /^[MmZzLlHhVvCcSsQqTtAa]$/;
const PATH_COMMAND_ARITY = new Map([
  ["a", 7],
  ["c", 6],
  ["h", 1],
  ["l", 2],
  ["m", 2],
  ["q", 4],
  ["s", 4],
  ["t", 2],
  ["v", 1],
  ["z", 0],
]);

export const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "polygon",
  "style",
]);

const ROOT_ATTRIBUTES = new Set([
  "height",
  "id",
  "version",
  "viewBox",
  "width",
  "xml:space",
  "xmlns",
  "xmlns:xlink",
]);

const DRAWING_ATTRIBUTES = new Map([
  [
    "g",
    new Set([
      "fill",
      "fill-rule",
      "stroke",
      "stroke-linecap",
      "stroke-width",
      "transform",
    ]),
  ],
  [
    "path",
    new Set([
      "aria-label",
      "d",
      "fill",
      "fill-rule",
      "stroke",
      "stroke-dashoffset",
      "stroke-linecap",
      "stroke-width",
    ]),
  ],
  [
    "rect",
    new Set([
      "fill",
      "height",
      "rx",
      "ry",
      "stroke",
      "stroke-dashoffset",
      "stroke-width",
      "width",
      "x",
      "y",
    ]),
  ],
  ["circle", new Set(["cx", "cy", "fill", "r"])],
  ["ellipse", new Set(["cx", "cy", "rx", "ry"])],
  [
    "polygon",
    new Set([
      "fill",
      "points",
      "stroke",
      "stroke-miterlimit",
      "stroke-width",
    ]),
  ],
  ["style", new Set()],
]);

const NUMERIC_ATTRIBUTES = new Set([
  "cx",
  "cy",
  "height",
  "r",
  "rx",
  "ry",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "stroke-width",
  "width",
  "x",
  "y",
]);

const NON_NEGATIVE_ATTRIBUTES = new Set([
  "height",
  "r",
  "rx",
  "ry",
  "stroke-width",
  "width",
]);

function fail(filename, message) {
  throw new Error(`${filename}: ${message}`);
}

function stripExactXmlDeclaration(source, filename) {
  if (typeof source !== "string") {
    fail(filename, "SVG source must be a string");
  }
  return source.startsWith(EXACT_XML_DECLARATION)
    ? source.slice(EXACT_XML_DECLARATION.length)
    : source;
}

function rejectForbiddenLexemes(source, filename) {
  if (/<!ENTITY\b/i.test(source)) {
    fail(filename, "entity declarations are forbidden");
  }
  if (/<!DOCTYPE\b/i.test(source)) {
    fail(filename, "DOCTYPE declarations are forbidden");
  }
  if (/@import\b/i.test(source)) {
    fail(filename, "@import is forbidden");
  }
  if (/\burl\s*\(/i.test(source)) {
    fail(filename, "url(...) values are forbidden");
  }
}

function parseStrictSvg(source, filename) {
  const parser = new SaxesParser({
    defaultXMLVersion: "1.0",
    fileName: filename,
    forceXMLVersion: true,
    xmlns: true,
  });
  const stack = [];
  let root;

  parser.on("xmldecl", () => {
    fail(filename, "XML declaration must exactly match the reviewed declaration");
  });
  parser.on("processinginstruction", ({ target }) => {
    fail(filename, `processing instruction ${JSON.stringify(target)} is forbidden`);
  });
  parser.on("doctype", () => {
    fail(filename, "DOCTYPE declarations are forbidden");
  });
  parser.on("cdata", () => {
    fail(filename, "CDATA is forbidden");
  });
  parser.on("opentag", (tag) => {
    const attributes = Object.fromEntries(
      Object.values(tag.attributes).map((attribute) => [
        attribute.name,
        attribute.value,
      ]),
    );
    const node = {
      attributes,
      children: [],
      name: tag.name,
      namespace: tag.uri,
      text: "",
    };

    if (stack.length === 0) {
      if (root !== undefined) {
        fail(filename, "SVG must contain exactly one root element");
      }
      root = node;
    } else {
      stack.at(-1).children.push(node);
    }
    stack.push(node);
  });
  parser.on("text", (text) => {
    if (stack.length === 0) {
      if (text.trim() !== "") {
        fail(filename, "text outside the SVG root is forbidden");
      }
      return;
    }
    stack.at(-1).text += text;
  });
  parser.on("closetag", () => {
    stack.pop();
  });

  try {
    parser.write(source).close();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${filename}:`)) {
      throw error;
    }
    fail(filename, error instanceof Error ? error.message : String(error));
  }

  if (root === undefined) {
    fail(filename, "SVG root is missing");
  }
  return root;
}

function parseFiniteNumberList(value) {
  if (!NUMBER_LIST.test(value)) {
    return undefined;
  }
  const numbers = Array.from(value.matchAll(NUMBER_TOKEN), (match) =>
    Number(match[0]),
  );
  return numbers.every(Number.isFinite) ? numbers : undefined;
}

function isSvgWhitespace(character) {
  return (
    character === " " ||
    character === "\t" ||
    character === "\n" ||
    character === "\r"
  );
}

function tokenizePathData(value) {
  const tokens = [];
  let index = 0;

  while (index < value.length) {
    const whitespaceStart = index;
    while (index < value.length && isSvgWhitespace(value[index])) {
      index += 1;
    }
    const hadWhitespace = index > whitespaceStart;
    let hadComma = false;

    if (value[index] === ",") {
      if (tokens.at(-1)?.type !== "number") {
        return undefined;
      }
      hadComma = true;
      index += 1;
      while (index < value.length && isSvgWhitespace(value[index])) {
        index += 1;
      }
    }

    if (index === value.length) {
      return hadComma ? undefined : tokens;
    }

    const character = value[index];
    if (PATH_COMMAND.test(character)) {
      if (hadComma) {
        return undefined;
      }
      tokens.push({ type: "command", value: character });
      index += 1;
      continue;
    }

    PATH_NUMBER.lastIndex = index;
    const match = PATH_NUMBER.exec(value);
    if (match === null) {
      return undefined;
    }
    if (
      tokens.at(-1)?.type === "number" &&
      !hadWhitespace &&
      !hadComma &&
      !/^[+.\-]/.test(match[0])
    ) {
      return undefined;
    }
    const number = Number(match[0]);
    if (!Number.isFinite(number)) {
      return undefined;
    }
    tokens.push({ raw: match[0], type: "number", value: number });
    index = PATH_NUMBER.lastIndex;
  }

  return tokens;
}

function isValidPathData(value) {
  const tokens = tokenizePathData(value);
  if (
    tokens === undefined ||
    tokens.length === 0 ||
    tokens[0].type !== "command" ||
    tokens[0].value.toLowerCase() !== "m"
  ) {
    return false;
  }

  let index = 0;
  while (index < tokens.length) {
    const command = tokens[index];
    if (command.type !== "command") {
      return false;
    }
    const normalizedCommand = command.value.toLowerCase();
    const arity = PATH_COMMAND_ARITY.get(normalizedCommand);
    index += 1;

    const parametersStart = index;
    while (index < tokens.length && tokens[index].type === "number") {
      index += 1;
    }
    const parameterCount = index - parametersStart;
    if (
      arity === undefined ||
      (arity === 0 && parameterCount !== 0) ||
      (arity !== 0 && (parameterCount === 0 || parameterCount % arity !== 0))
    ) {
      return false;
    }

    if (normalizedCommand === "a") {
      for (let offset = parametersStart; offset < index; offset += arity) {
        if (
          tokens[offset].raw.startsWith("-") ||
          tokens[offset + 1].raw.startsWith("-") ||
          (tokens[offset + 3].raw !== "0" && tokens[offset + 3].raw !== "1") ||
          (tokens[offset + 4].raw !== "0" && tokens[offset + 4].raw !== "1")
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

function validateViewBox(value, filename) {
  if (value === undefined) {
    fail(filename, "root viewBox is required");
  }
  const values = parseFiniteNumberList(value);
  if (
    values === undefined ||
    values.length !== 4 ||
    values[2] <= 0 ||
    values[3] <= 0
  ) {
    fail(filename, `invalid viewBox ${JSON.stringify(value)}`);
  }
}

function validateRootMetadata(name, value, filename) {
  switch (name) {
    case "viewBox":
      validateViewBox(value, filename);
      return;
    case "width":
    case "height":
      if (
        !NUMBER.test(value) ||
        !Number.isFinite(Number(value)) ||
        Number(value) <= 0
      ) {
        fail(filename, `invalid root ${name} ${JSON.stringify(value)}`);
      }
      return;
    case "version":
      if (value !== "1.1") {
        fail(filename, `invalid root version ${JSON.stringify(value)}`);
      }
      return;
    case "xml:space":
      if (value !== "preserve" && value !== "default") {
        fail(filename, `invalid xml:space ${JSON.stringify(value)}`);
      }
      return;
    case "xmlns":
      if (value !== SVG_NAMESPACE) {
        fail(filename, `invalid SVG namespace ${JSON.stringify(value)}`);
      }
      return;
    case "xmlns:xlink":
      if (value !== XLINK_NAMESPACE) {
        fail(filename, `invalid xlink namespace ${JSON.stringify(value)}`);
      }
      return;
    case "id":
      if (!/^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(value)) {
        fail(filename, `invalid root id ${JSON.stringify(value)}`);
      }
  }
}

function validateAttributeValue(name, value, filename) {
  if (/^on/i.test(name) || name === "href" || name === "xlink:href") {
    fail(filename, `forbidden attribute ${JSON.stringify(name)}`);
  }
  if (NUMERIC_ATTRIBUTES.has(name)) {
    if (!NUMBER.test(value) || !Number.isFinite(Number(value))) {
      fail(filename, `invalid numeric ${name} ${JSON.stringify(value)}`);
    }
    if (NON_NEGATIVE_ATTRIBUTES.has(name) && value.startsWith("-")) {
      fail(filename, `invalid non-negative ${name} ${JSON.stringify(value)}`);
    }
  }
  if (
    (name === "fill" && !/^(?:currentColor|none)$/.test(value)) ||
    (name === "stroke" && !/^(?:currentColor|transparent)$/.test(value))
  ) {
    fail(filename, `invalid ${name} ${JSON.stringify(value)}`);
  }
  if (name === "fill-rule" && value !== "evenodd") {
    fail(filename, `invalid fill-rule ${JSON.stringify(value)}`);
  }
  if (name === "stroke-linecap" && value !== "butt" && value !== "square") {
    fail(filename, `invalid stroke-linecap ${JSON.stringify(value)}`);
  }
  if (name === "d" && !isValidPathData(value)) {
    fail(filename, `invalid path data ${JSON.stringify(value)}`);
  }
  if (name === "points") {
    const points = parseFiniteNumberList(value);
    if (points === undefined || points.length < 2 || points.length % 2 !== 0) {
      fail(filename, `invalid polygon points ${JSON.stringify(value)}`);
    }
  }
  if (name === "transform") {
    const match = /^matrix\(([\s\S]*)\)$/.exec(value);
    const matrix = match === null ? undefined : parseFiniteNumberList(match[1]);
    if (matrix === undefined || matrix.length !== 6) {
      fail(filename, `invalid transform ${JSON.stringify(value)}`);
    }
  }
  if (name === "aria-label" && !/^[A-Za-z0-9 ._-]+$/.test(value)) {
    fail(filename, `invalid aria-label ${JSON.stringify(value)}`);
  }
}

function validateNode(node, filename, parentName) {
  if (!ALLOWED_ELEMENTS.has(node.name)) {
    fail(filename, `element ${JSON.stringify(node.name)} is not allowed`);
  }
  if (node.namespace !== "" && node.namespace !== SVG_NAMESPACE) {
    fail(filename, `element ${JSON.stringify(node.name)} uses an invalid namespace`);
  }
  if (node.name === "svg" && parentName !== undefined) {
    fail(filename, "nested svg elements are forbidden");
  }

  const allowedAttributes = node.name === "svg"
    ? ROOT_ATTRIBUTES
    : DRAWING_ATTRIBUTES.get(node.name);
  for (const [name, value] of Object.entries(node.attributes)) {
    if (/^on/i.test(name) || name === "href" || name === "xlink:href") {
      fail(filename, `forbidden attribute ${JSON.stringify(name)}`);
    }
    if (!allowedAttributes.has(name)) {
      fail(filename, `attribute ${JSON.stringify(name)} is not allowed on ${node.name}`);
    }
    if (node.name === "svg") {
      validateRootMetadata(name, value, filename);
    } else {
      validateAttributeValue(name, value, filename);
    }
  }

  if (node.name === "style") {
    if (
      parentName !== "svg" ||
      node.children.length !== 0 ||
      node.text !== REVIEWED_GALLERY_STYLE
    ) {
      fail(filename, "only the exact reviewed gallery style is allowed");
    }
    return;
  }
  if (node.text.trim() !== "") {
    fail(filename, `text content is forbidden in ${node.name}`);
  }
  for (const child of node.children) {
    validateNode(child, filename, node.name);
  }
}

function validateRootAndAllowlist(root, filename) {
  if (root.name !== "svg") {
    fail(filename, "root element must be svg");
  }
  validateNode(root, filename, undefined);
  validateViewBox(root.attributes.viewBox, filename);
}

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function serializeNode(node) {
  if (node.name === "style") {
    return "";
  }
  const attributes = Object.entries(node.attributes)
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
  const children = node.children.map(serializeNode).join("");
  return children === ""
    ? `<${node.name}${attributes}/>`
    : `<${node.name}${attributes}>${children}</${node.name}>`;
}

function serializeChildren(root) {
  return root.children.map(serializeNode).join("");
}

export function parseSvgSource(source, { filename } = {}) {
  if (typeof filename !== "string" || filename === "") {
    throw new TypeError("parseSvgSource requires a non-empty filename");
  }
  const normalized = stripExactXmlDeclaration(source, filename);
  rejectForbiddenLexemes(normalized, filename);
  const ast = parseStrictSvg(normalized, filename);
  validateRootAndAllowlist(ast, filename);
  return {
    viewBox: ast.attributes.viewBox,
    markup: serializeChildren(ast),
  };
}
