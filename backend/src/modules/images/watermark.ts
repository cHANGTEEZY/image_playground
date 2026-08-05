import sharp, { type OverlayOptions } from "sharp";
import { applyOutputFormat } from "./images.format-utils";
import type { OutputFormat, WatermarkInput, WatermarkPosition } from "./images.types";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Renders text to a trimmed, transparent PNG via SVG (librsvg, always bundled with sharp). */
async function buildTextOverlay(
  text: string,
  fontSize: number,
  color: string,
): Promise<Buffer> {
  const canvasWidth = Math.max(64, Math.round(text.length * fontSize * 0.75));
  const canvasHeight = Math.round(fontSize * 1.6);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">
    <text x="0" y="${Math.round(fontSize * 1.05)}" font-family="sans-serif" font-size="${fontSize}" font-weight="700" fill="${color}">${escapeXml(text)}</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().trim().toBuffer();
}

async function loadOverlay(
  options: WatermarkInput,
  baseWidth: number,
  logoBuffer?: Buffer,
): Promise<Buffer> {
  if (options.type === "text") {
    return buildTextOverlay(
      (options.text ?? "").trim(),
      options.fontSize ?? 48,
      options.color ?? "#ffffff",
    );
  }

  if (!logoBuffer) {
    throw new Error("A logo image is required for a logo watermark.");
  }

  const targetWidth = Math.max(16, Math.round(baseWidth * options.scale));
  return sharp(logoBuffer, { failOn: "none" })
    .resize({ width: targetWidth, withoutEnlargement: false })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function applyOpacity(buffer: Buffer, opacity: number): Promise<Buffer> {
  if (opacity >= 0.999) return buffer;

  const { data, info } = await sharp(buffer, { failOn: "none" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < width * height; i++) {
    const alphaIndex = i * channels + channels - 1;
    data[alphaIndex] = Math.round(data[alphaIndex] * opacity);
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

function computeOffset(
  position: WatermarkPosition,
  margin: number,
  baseWidth: number,
  baseHeight: number,
  overlayWidth: number,
  overlayHeight: number,
): { left: number; top: number } {
  let left: number;
  if (position.includes("left")) left = margin;
  else if (position.includes("right")) left = baseWidth - overlayWidth - margin;
  else left = Math.round((baseWidth - overlayWidth) / 2);

  let top: number;
  if (position.startsWith("top")) top = margin;
  else if (position.startsWith("bottom")) top = baseHeight - overlayHeight - margin;
  else top = Math.round((baseHeight - overlayHeight) / 2);

  return {
    left: Math.max(0, Math.min(left, Math.max(0, baseWidth - overlayWidth))),
    top: Math.max(0, Math.min(top, Math.max(0, baseHeight - overlayHeight))),
  };
}

function buildTileComposites(
  overlay: Buffer,
  overlayWidth: number,
  overlayHeight: number,
  baseWidth: number,
  baseHeight: number,
  margin: number,
): OverlayOptions[] {
  const stepX = overlayWidth + margin;
  const stepY = overlayHeight + margin;
  const composites: OverlayOptions[] = [];

  for (let top = margin; top < baseHeight; top += stepY) {
    for (let left = margin; left < baseWidth; left += stepX) {
      composites.push({ input: overlay, left, top });
    }
  }

  return composites;
}

export async function applyWatermark(
  input: Buffer,
  options: WatermarkInput,
  logoBuffer?: Buffer,
  format?: OutputFormat,
): Promise<Buffer> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (!width || !height) {
    throw new Error("Could not read image dimensions.");
  }

  const rawOverlay = await loadOverlay(options, width, logoBuffer);
  const overlay = await applyOpacity(rawOverlay, options.opacity);

  const overlayMeta = await sharp(overlay, { failOn: "none" }).metadata();
  const overlayWidth = overlayMeta.width ?? 0;
  const overlayHeight = overlayMeta.height ?? 0;

  const composites = options.tile
    ? buildTileComposites(
        overlay,
        overlayWidth,
        overlayHeight,
        width,
        height,
        options.margin,
      )
    : [
        {
          input: overlay,
          ...computeOffset(
            options.position,
            options.margin,
            width,
            height,
            overlayWidth,
            overlayHeight,
          ),
        },
      ];

  const outputFormat: OutputFormat =
    format ??
    (meta.format === "jpeg" ? "jpeg" : meta.format === "webp" ? "webp" : "png");

  const pipeline = sharp(input, { failOn: "none" }).composite(composites);
  return applyOutputFormat(pipeline, outputFormat).toBuffer();
}
