import sharp from "sharp";
import {
  removeBackgroundHighQuality,
  type RemoveBackgroundOptions,
} from "./background-removal";
import type { BackgroundReplaceMode } from "./images.types";

export interface BackgroundReplaceOptions extends RemoveBackgroundOptions {
  mode: BackgroundReplaceMode;
  /** Hex color, used when mode === "color". */
  color?: string;
  /** Gaussian blur sigma, used when mode === "blur". */
  blurSigma?: number;
  /** Required when mode === "image". */
  backgroundImage?: Buffer;
}

/**
 * Removes the background from `input` and composites the subject onto a new
 * backdrop: a solid color, a blurred version of the original photo, or a
 * separately uploaded background image.
 */
export async function replaceBackground(
  input: Buffer,
  options: BackgroundReplaceOptions,
): Promise<Buffer> {
  const subjectRgba = await removeBackgroundHighQuality(input, options);
  const meta = await sharp(subjectRgba, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (!width || !height) {
    throw new Error("Could not read image dimensions.");
  }

  let backgroundBuffer: Buffer;

  if (options.mode === "color") {
    backgroundBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: options.color ?? "#ffffff",
      },
    })
      .png()
      .toBuffer();
  } else if (options.mode === "blur") {
    backgroundBuffer = await sharp(input, { failOn: "none" })
      .resize(width, height, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .blur(options.blurSigma ?? 20)
      .png()
      .toBuffer();
  } else {
    if (!options.backgroundImage) {
      throw new Error("A background image is required for this mode.");
    }
    backgroundBuffer = await sharp(options.backgroundImage, { failOn: "none" })
      .resize(width, height, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
  }

  return sharp(backgroundBuffer, { failOn: "none" })
    .composite([{ input: subjectRgba }])
    .png({ compressionLevel: 6, effort: 10 })
    .toBuffer();
}
