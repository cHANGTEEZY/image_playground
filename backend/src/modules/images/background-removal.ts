import { removeBackground, type Config } from "@imgly/background-removal-node";
import sharp from "sharp";

/** Model inference runs at 1024px; masks upscaled above this stay sharper on large inputs. */
const SEGMENTATION_EDGE = 1024;

/** Preserve detail on high-res uploads while bounding memory use. */
export const MAX_BG_REMOVAL_EDGE = 4096;

/** Drop residual background speckle without crushing soft anti-aliased edges. */
const ALPHA_NOISE_FLOOR = 12;

const removalConfig: Pick<Config, "model" | "output"> = {
  // "medium" is the highest-quality model bundled with @imgly/background-removal-node.
  // "small" is faster but produces a noisy alpha mask with visible background artifacts.
  model: "medium",
  output: {
    format: "image/png",
    quality: 1,
  },
};

async function capResolution(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (!width || !height) {
    throw new Error("Could not read image dimensions.");
  }

  if (width <= MAX_BG_REMOVAL_EDGE && height <= MAX_BG_REMOVAL_EDGE) {
    return input;
  }

  return sharp(input, { failOn: "none" })
    .resize({
      width: MAX_BG_REMOVAL_EDGE,
      height: MAX_BG_REMOVAL_EDGE,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

async function segmentationInput(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none" })
    .resize({
      width: SEGMENTATION_EDGE,
      height: SEGMENTATION_EDGE,
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

async function extractAlphaMask(segmentedPng: Buffer): Promise<{
  mask: Buffer;
  width: number;
  height: number;
}> {
  const { data, info } = await sharp(segmentedPng, { failOn: "none" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const alphaChannel = channels - 1;
  const mask = Buffer.alloc(width * height);

  for (let i = 0; i < width * height; i++) {
    let alpha = data[i * channels + alphaChannel];

    if (alpha < ALPHA_NOISE_FLOOR) {
      alpha = 0;
    } else if (alpha > 252) {
      alpha = 255;
    }

    mask[i] = alpha;
  }

  return { mask, width, height };
}

async function upscaleMask(
  mask: Buffer,
  segWidth: number,
  segHeight: number,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(mask, {
    raw: { width: segWidth, height: segHeight, channels: 1 },
  })
    .resize(width, height, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .greyscale()
    .raw()
    .toBuffer();
}

async function segmentAtModelResolution(input: Buffer): Promise<Buffer> {
  const segSource = await segmentationInput(input);
  const blob = await removeBackground(
    new Blob([new Uint8Array(segSource)], { type: "image/png" }),
    removalConfig,
  );

  return Buffer.from(await blob.arrayBuffer());
}

export async function removeBackgroundHighQuality(input: Buffer): Promise<Buffer> {
  const original = await capResolution(input);
  const meta = await sharp(original, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (!width || !height) {
    throw new Error("Could not read image dimensions.");
  }

  const segmented = await segmentAtModelResolution(original);
  const { mask, width: segWidth, height: segHeight } =
    await extractAlphaMask(segmented);
  const fullMask = await upscaleMask(mask, segWidth, segHeight, width, height);

  const { data: rgbData } = await sharp(original, { failOn: "none" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return sharp(rgbData, { raw: { width, height, channels: 3 } })
    .joinChannel(fullMask, { raw: { width, height, channels: 1 } })
    .png({
      compressionLevel: 6,
      effort: 10,
      palette: false,
    })
    .toBuffer();
}
