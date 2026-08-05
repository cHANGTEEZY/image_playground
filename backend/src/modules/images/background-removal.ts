import { removeBackground, type Config } from "@imgly/background-removal-node";
import sharp from "sharp";

/** Model inference runs at 1024px; masks upscaled above this stay sharper on large inputs. */
const SEGMENTATION_EDGE = 1024;

/** Preserve detail on high-res uploads while bounding memory use. */
export const MAX_BG_REMOVAL_EDGE = 4096;

/** Drop residual background speckle without crushing soft anti-aliased edges. */
const ALPHA_NOISE_FLOOR = 12;
const ALPHA_CEILING = 252;

/** Connected components smaller than this fraction of the mask are treated as noise. */
const FOREGROUND_ISLAND_MAX_AREA_RATIO = 0.0015;
const HOLE_MAX_AREA_RATIO = 0.0015;
const BINARY_THRESHOLD = 128;

/** Guided filter window radius (px) and regularization, tuned for edge sharpening without haloing. */
const GUIDED_FILTER_RADIUS = 12;
const GUIDED_FILTER_EPS = 1e-4;

/** Only touch semi-transparent boundary pixels; fully opaque/transparent pixels are left alone. */
const DEFRINGE_LOW = 10;
const DEFRINGE_HIGH = 245;
const DEFRINGE_SEARCH_RADIUS = 3;

const removalConfig: Pick<Config, "model" | "output"> = {
  // "medium" is the highest-quality model bundled with @imgly/background-removal-node.
  // "small" is faster but produces a noisy alpha mask with visible background artifacts.
  model: "medium",
  output: {
    format: "image/png",
    quality: 1,
  },
};

export interface RemoveBackgroundOptions {
  /**
   * Also segments a horizontally-flipped copy and averages both raw masks
   * (test-time augmentation) before cleanup. ~2x slower, meaningfully less
   * noisy on hard edges. Opt-in because of the latency cost.
   */
  extraAccurate?: boolean;
}

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

/**
 * Resizes to fit inside a SEGMENTATION_EDGE square, then mirror-pads to an
 * exact square. @imgly's internal inference step forces a resize to exactly
 * 1024x1024, which anisotropically stretches non-square inputs and distorts
 * subject proportions. Feeding it an already-square, mirror-padded image
 * makes that internal resize a no-op and avoids the distortion.
 */
async function prepareSegmentationInput(input: Buffer): Promise<{
  buffer: Buffer;
  contentWidth: number;
  contentHeight: number;
}> {
  const { data: fitted, info } = await sharp(input, { failOn: "none" })
    .resize({
      width: SEGMENTATION_EDGE,
      height: SEGMENTATION_EDGE,
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const contentWidth = info.width;
  const contentHeight = info.height;

  if (contentWidth === SEGMENTATION_EDGE && contentHeight === SEGMENTATION_EDGE) {
    return { buffer: fitted, contentWidth, contentHeight };
  }

  const padded = await sharp(fitted, { failOn: "none" })
    .extend({
      top: 0,
      left: 0,
      bottom: SEGMENTATION_EDGE - contentHeight,
      right: SEGMENTATION_EDGE - contentWidth,
      extendWith: "mirror",
    })
    .png()
    .toBuffer();

  return { buffer: padded, contentWidth, contentHeight };
}

/** Runs IS-Net on the padded square input, optionally flipping first (for TTA) and flopping the result back. */
async function segmentAtModelResolution(
  paddedSquareInput: Buffer,
  flip: boolean,
): Promise<Buffer> {
  const source = flip
    ? await sharp(paddedSquareInput, { failOn: "none" }).flop().toBuffer()
    : paddedSquareInput;

  const blob = await removeBackground(
    new Blob([new Uint8Array(source)], { type: "image/png" }),
    removalConfig,
  );
  const segmented = Buffer.from(await blob.arrayBuffer());

  if (!flip) {
    return segmented;
  }

  return sharp(segmented, { failOn: "none" }).flop().toBuffer();
}

/** Extracts the raw (unclamped) alpha channel as a single-channel buffer. */
async function extractRawAlpha(segmentedPng: Buffer): Promise<{
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
    mask[i] = data[i * channels + alphaChannel];
  }

  return { mask, width, height };
}

function averageMasks(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = Math.round((a[i] + b[i]) / 2);
  }
  return out;
}

function applyNoiseFloor(mask: Buffer): Buffer {
  const out = Buffer.alloc(mask.length);
  for (let i = 0; i < mask.length; i++) {
    const value = mask[i];
    if (value < ALPHA_NOISE_FLOOR) {
      out[i] = 0;
    } else if (value > ALPHA_CEILING) {
      out[i] = 255;
    } else {
      out[i] = value;
    }
  }
  return out;
}

async function cropMaskToContent(
  mask: Buffer,
  fullWidth: number,
  fullHeight: number,
  contentWidth: number,
  contentHeight: number,
): Promise<Buffer> {
  if (contentWidth === fullWidth && contentHeight === fullHeight) {
    return mask;
  }

  return sharp(mask, {
    raw: { width: fullWidth, height: fullHeight, channels: 1 },
  })
    .extract({ left: 0, top: 0, width: contentWidth, height: contentHeight })
    .raw()
    .toBuffer();
}

/**
 * Removes small disconnected foreground speckles (background noise the model
 * misclassified) and fills small fully-enclosed background holes inside the
 * subject (model dropout), using 4-connected component labeling. Only acts
 * on components below a small area threshold, so legitimate multi-part
 * subjects and larger intentional cutouts (e.g. a mug handle) are untouched.
 */
function cleanupMaskIslands(mask: Buffer, width: number, height: number): Buffer {
  const n = width * height;
  const binary = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    binary[i] = mask[i] >= BINARY_THRESHOLD ? 1 : 0;
  }

  const labels = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  const componentSize: number[] = [];
  const componentTouchesBorder: boolean[] = [];
  const componentValue: number[] = [];

  for (let start = 0; start < n; start++) {
    if (labels[start] !== -1) continue;

    const value = binary[start];
    const label = componentSize.length;
    let stackSize = 0;
    stack[stackSize++] = start;
    labels[start] = label;

    let size = 0;
    let touchesBorder = false;

    while (stackSize > 0) {
      const idx = stack[--stackSize];
      size++;

      const x = idx % width;
      const y = (idx / width) | 0;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        touchesBorder = true;
      }

      if (x > 0) {
        const left = idx - 1;
        if (labels[left] === -1 && binary[left] === value) {
          labels[left] = label;
          stack[stackSize++] = left;
        }
      }
      if (x < width - 1) {
        const right = idx + 1;
        if (labels[right] === -1 && binary[right] === value) {
          labels[right] = label;
          stack[stackSize++] = right;
        }
      }
      if (y > 0) {
        const up = idx - width;
        if (labels[up] === -1 && binary[up] === value) {
          labels[up] = label;
          stack[stackSize++] = up;
        }
      }
      if (y < height - 1) {
        const down = idx + width;
        if (labels[down] === -1 && binary[down] === value) {
          labels[down] = label;
          stack[stackSize++] = down;
        }
      }
    }

    componentSize.push(size);
    componentTouchesBorder.push(touchesBorder);
    componentValue.push(value);
  }

  const foregroundMaxArea = n * FOREGROUND_ISLAND_MAX_AREA_RATIO;
  const holeMaxArea = n * HOLE_MAX_AREA_RATIO;

  const out = Buffer.from(mask);
  for (let i = 0; i < n; i++) {
    const label = labels[i];
    const size = componentSize[label];
    const value = componentValue[label];

    if (value === 1 && size < foregroundMaxArea) {
      out[i] = 0;
    } else if (value === 0 && !componentTouchesBorder[label] && size < holeMaxArea) {
      out[i] = 255;
    }
  }

  return out;
}

async function upscaleMaskLanczos(
  mask: Buffer,
  contentWidth: number,
  contentHeight: number,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(mask, {
    raw: { width: contentWidth, height: contentHeight, channels: 1 },
  })
    .resize(width, height, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .greyscale()
    .raw()
    .toBuffer();
}

// ─── Guided filter (edge-aware mask refinement) ────────────────────────────
//
// Sharpens a coarse upscaled mask against the full-resolution original image
// so edges (hair, foliage, fabric) follow real image detail instead of the
// blur introduced by upscaling a low-resolution model mask. Implemented as a
// separable box filter (exact, edge-clamped) rather than pulling in a matting
// library, per He et al. "Guided Image Filtering" (2010).

function clampIndex(value: number, max: number): number {
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

function boxBlur1D(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
): Float32Array {
  const out = new Float32Array(src.length);
  const windowSize = 2 * radius + 1;

  if (horizontal) {
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      let sum = 0;
      for (let x = -radius; x <= radius; x++) {
        sum += src[rowOffset + clampIndex(x, width - 1)];
      }
      out[rowOffset] = sum / windowSize;
      for (let x = 1; x < width; x++) {
        const addX = clampIndex(x + radius, width - 1);
        const removeX = clampIndex(x - radius - 1, width - 1);
        sum += src[rowOffset + addX] - src[rowOffset + removeX];
        out[rowOffset + x] = sum / windowSize;
      }
    }
  } else {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) {
        sum += src[clampIndex(y, height - 1) * width + x];
      }
      out[x] = sum / windowSize;
      for (let y = 1; y < height; y++) {
        const addY = clampIndex(y + radius, height - 1);
        const removeY = clampIndex(y - radius - 1, height - 1);
        sum += src[addY * width + x] - src[removeY * width + x];
        out[y * width + x] = sum / windowSize;
      }
    }
  }

  return out;
}

function boxBlur2D(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const horizontallyBlurred = boxBlur1D(src, width, height, radius, true);
  return boxBlur1D(horizontallyBlurred, width, height, radius, false);
}

function guidedFilter(
  guide: Float32Array,
  input: Float32Array,
  width: number,
  height: number,
  radius: number,
  eps: number,
): Float32Array {
  const n = width * height;

  const meanI = boxBlur2D(guide, width, height, radius);
  const meanP = boxBlur2D(input, width, height, radius);

  const guideSquared = new Float32Array(n);
  const guideTimesInput = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    guideSquared[i] = guide[i] * guide[i];
    guideTimesInput[i] = guide[i] * input[i];
  }

  const corrI = boxBlur2D(guideSquared, width, height, radius);
  const corrIP = boxBlur2D(guideTimesInput, width, height, radius);

  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = corrI[i] - meanI[i] * meanI[i];
    const covIP = corrIP[i] - meanI[i] * meanP[i];
    const ai = covIP / (varI + eps);
    a[i] = ai;
    b[i] = meanP[i] - ai * meanI[i];
  }

  const meanA = boxBlur2D(a, width, height, radius);
  const meanB = boxBlur2D(b, width, height, radius);

  const output = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    output[i] = meanA[i] * guide[i] + meanB[i];
  }

  return output;
}

function rgbToLuminanceFloat(rgb: Buffer, width: number, height: number): Float32Array {
  const n = width * height;
  const guide = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 3;
    guide[i] = (0.299 * rgb[p] + 0.587 * rgb[p + 1] + 0.114 * rgb[p + 2]) / 255;
  }
  return guide;
}

function bufferToUnitFloat(buf: Buffer): Float32Array {
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] / 255;
  }
  return out;
}

function unitFloatToBuffer(arr: Float32Array): Buffer {
  const out = Buffer.alloc(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const clamped = Math.min(1, Math.max(0, arr[i]));
    out[i] = Math.round(clamped * 255);
  }
  return out;
}

function refineMaskWithGuidedFilter(
  rgb: Buffer,
  mask: Buffer,
  width: number,
  height: number,
): Buffer {
  const guide = rgbToLuminanceFloat(rgb, width, height);
  const input = bufferToUnitFloat(mask);
  const refined = guidedFilter(
    guide,
    input,
    width,
    height,
    GUIDED_FILTER_RADIUS,
    GUIDED_FILTER_EPS,
  );
  return unitFloatToBuffer(refined);
}

/**
 * For semi-transparent boundary pixels, replaces the RGB with the average of
 * nearby confidently-opaque foreground pixels. This removes background-color
 * bleed (a dark/light "fringe") baked into anti-aliased edge pixels of the
 * original photo, which would otherwise show up as a halo when composited
 * onto a different background.
 */
function defringeEdges(
  rgb: Buffer,
  mask: Buffer,
  width: number,
  height: number,
): Buffer {
  const out = Buffer.from(rgb);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const alpha = mask[idx];
      if (alpha <= DEFRINGE_LOW || alpha >= DEFRINGE_HIGH) continue;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let dy = -DEFRINGE_SEARCH_RADIUS; dy <= DEFRINGE_SEARCH_RADIUS; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -DEFRINGE_SEARCH_RADIUS; dx <= DEFRINGE_SEARCH_RADIUS; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const nIdx = ny * width + nx;
          if (mask[nIdx] < DEFRINGE_HIGH) continue;

          const p = nIdx * 3;
          rSum += rgb[p];
          gSum += rgb[p + 1];
          bSum += rgb[p + 2];
          count++;
        }
      }

      if (count === 0) continue;

      const p = idx * 3;
      out[p] = Math.round(rSum / count);
      out[p + 1] = Math.round(gSum / count);
      out[p + 2] = Math.round(bSum / count);
    }
  }

  return out;
}

export async function removeBackgroundHighQuality(
  input: Buffer,
  options: RemoveBackgroundOptions = {},
): Promise<Buffer> {
  const original = await capResolution(input);
  const meta = await sharp(original, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (!width || !height) {
    throw new Error("Could not read image dimensions.");
  }

  const { buffer: paddedInput, contentWidth, contentHeight } =
    await prepareSegmentationInput(original);

  const primarySegmented = await segmentAtModelResolution(paddedInput, false);
  const primaryAlpha = await extractRawAlpha(primarySegmented);

  let rawMask = primaryAlpha.mask;

  if (options.extraAccurate) {
    const flippedSegmented = await segmentAtModelResolution(paddedInput, true);
    const flippedAlpha = await extractRawAlpha(flippedSegmented);
    rawMask = averageMasks(primaryAlpha.mask, flippedAlpha.mask);
  }

  const contentMask = await cropMaskToContent(
    rawMask,
    primaryAlpha.width,
    primaryAlpha.height,
    contentWidth,
    contentHeight,
  );

  const flooredMask = applyNoiseFloor(contentMask);
  const cleanedMask = cleanupMaskIslands(flooredMask, contentWidth, contentHeight);
  const upscaledMask = await upscaleMaskLanczos(
    cleanedMask,
    contentWidth,
    contentHeight,
    width,
    height,
  );

  const { data: rgbData } = await sharp(original, { failOn: "none" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const refinedMask = refineMaskWithGuidedFilter(rgbData, upscaledMask, width, height);
  const decontaminatedRgb = defringeEdges(rgbData, refinedMask, width, height);

  return sharp(decontaminatedRgb, { raw: { width, height, channels: 3 } })
    .joinChannel(refinedMask, { raw: { width, height, channels: 1 } })
    .png({
      compressionLevel: 6,
      effort: 10,
      palette: false,
    })
    .toBuffer();
}
