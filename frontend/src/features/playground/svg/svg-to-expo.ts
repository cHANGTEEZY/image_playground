/**
 * Lightweight SVG → react-native-svg component transformer for the browser.
 * Avoids shipping Node-only SVGR tooling into the Vite client bundle.
 */

const TAG_MAP: Record<string, string> = {
  svg: "Svg",
  path: "Path",
  circle: "Circle",
  rect: "Rect",
  g: "G",
  defs: "Defs",
  clippath: "ClipPath",
  lineargradient: "LinearGradient",
  radialgradient: "RadialGradient",
  stop: "Stop",
  ellipse: "Ellipse",
  line: "Line",
  polygon: "Polygon",
  polyline: "Polyline",
  text: "Text",
  tspan: "TSpan",
  mask: "Mask",
  pattern: "Pattern",
  use: "Use",
  symbol: "Symbol",
  foreignobject: "ForeignObject",
};

const IMPORTABLE = new Set(Object.values(TAG_MAP).filter((t) => t !== "Svg"));

function toCamelCase(attr: string): string {
  if (attr.startsWith("data-") || attr.startsWith("aria-")) return attr;
  return attr.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function serializeAttrs(el: Element): string {
  const parts: string[] = [];
  for (const attr of Array.from(el.attributes)) {
    const name = toCamelCase(attr.name);
    if (name === "class") {
      parts.push(`className="${attr.value}"`);
      continue;
    }
    if (name === "style") continue;
    const num = Number(attr.value);
    if (
      attr.value !== "" &&
      !Number.isNaN(num) &&
      /^(width|height|x|y|cx|cy|r|rx|ry|opacity|strokeWidth|strokeOpacity|fillOpacity|fontSize)$/i.test(
        name,
      )
    ) {
      parts.push(`${name}={${num}}`);
    } else {
      parts.push(`${name}="${attr.value.replace(/"/g, '\\"')}"`);
    }
  }
  return parts.length ? ` ${parts.join(" ")}` : "";
}

function convertElement(el: Element, indent: number): string {
  const pad = "  ".repeat(indent);
  const mapped = TAG_MAP[el.tagName.toLowerCase()];
  if (!mapped) {
    return Array.from(el.children)
      .map((child) => convertElement(child as Element, indent))
      .join("\n");
  }

  const attrs = serializeAttrs(el);
  const children = Array.from(el.children);

  if (children.length === 0) {
    const text = el.textContent?.trim();
    if (text && (mapped === "Text" || mapped === "TSpan")) {
      return `${pad}<${mapped}${attrs}>\n${pad}  ${text}\n${pad}</${mapped}>`;
    }
    return `${pad}<${mapped}${attrs} />`;
  }

  const inner = children
    .map((child) => convertElement(child as Element, indent + 1))
    .filter(Boolean)
    .join("\n");

  return `${pad}<${mapped}${attrs}>\n${inner}\n${pad}</${mapped}>`;
}

function collectTags(el: Element, set: Set<string>) {
  const mapped = TAG_MAP[el.tagName.toLowerCase()];
  if (mapped && mapped !== "Svg") set.add(mapped);
  for (const child of Array.from(el.children)) {
    collectTags(child as Element, set);
  }
}

export function svgToExpoComponent(
  svgSource: string,
  componentName = "GeneratedIcon",
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgSource.trim(), "image/svg+xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid SVG markup");
  }

  const svg = doc.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg") {
    throw new Error("Root element must be <svg>");
  }

  const used = new Set<string>();
  collectTags(svg, used);
  const childImports = Array.from(used)
    .filter((name) => name !== "Svg" && IMPORTABLE.has(name))
    .sort();

  const body = convertElement(svg, 2).replace("<Svg", "<Svg {...props}");
  const importLine =
    childImports.length > 0
      ? `import Svg, { ${childImports.join(", ")} } from 'react-native-svg';`
      : `import Svg from 'react-native-svg';`;

  return `// Expo / React Native — requires: npx expo install react-native-svg
import type { SvgProps } from 'react-native-svg';
${importLine}

export default function ${componentName}(props: SvgProps) {
  return (
${body}
  );
}
`;
}
