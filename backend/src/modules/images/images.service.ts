import sharp from "sharp";
import { removeBackgroundHighQuality } from "./background-removal";
import { replaceBackground } from "./background-replace";
import { applyWatermark } from "./watermark";
import { applyOutputFormat, contentTypeForFormat, extensionForFormat } from "./images.format-utils";
import {
  type BackgroundReplaceInput,
  type ConvertInput,
  type CropInput,
  type ProcessedImage,
  type ResizeInput,
  type RotateInput,
  type WatermarkInput,
} from "./images.types";

async function toBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

function baseName(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, "");
  return name || "image";
}

async function detectFormat(
  input: Buffer,
): Promise<"png" | "jpeg" | "webp" | undefined> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  if (meta.format === "jpeg" || meta.format === "png" || meta.format === "webp") {
    return meta.format;
  }
  return undefined;
}

export const imagesService = {
  async removeBackground(
    file: File,
    options: { extraAccurate?: boolean } = {},
  ): Promise<ProcessedImage> {
    const original = await toBuffer(file);
    const buffer = await removeBackgroundHighQuality(original, options);

    return {
      buffer,
      contentType: "image/png",
      filename: `${baseName(file.name)}-no-bg.png`,
    };
  },

  async crop(file: File, crop: CropInput): Promise<ProcessedImage> {
    const input = await toBuffer(file);
    const meta = await sharp(input, { failOn: "none" }).metadata();
    const imgWidth = meta.width ?? 0;
    const imgHeight = meta.height ?? 0;

    if (!imgWidth || !imgHeight) {
      throw new Error("Could not read image dimensions.");
    }

    if (
      crop.left + crop.width > imgWidth ||
      crop.top + crop.height > imgHeight
    ) {
      throw new Error(
        `Crop region exceeds image bounds (${imgWidth}x${imgHeight}).`,
      );
    }

    const format = crop.format ?? "png";
    const pipeline = sharp(input, { failOn: "none" }).extract({
      left: crop.left,
      top: crop.top,
      width: crop.width,
      height: crop.height,
    });

    const buffer = await applyOutputFormat(pipeline, format).toBuffer();

    return {
      buffer,
      contentType: contentTypeForFormat(format),
      filename: `${baseName(file.name)}-cropped.${extensionForFormat(format)}`,
    };
  },

  async resize(file: File, input: ResizeInput): Promise<ProcessedImage> {
    const original = await toBuffer(file);
    const detected = await detectFormat(original);
    const format = input.format ?? detected ?? "png";

    const pipeline = sharp(original, { failOn: "none" }).resize({
      width: input.width,
      height: input.height,
      fit: input.fit ?? "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    });

    const buffer = await applyOutputFormat(pipeline, format).toBuffer();

    return {
      buffer,
      contentType: contentTypeForFormat(format),
      filename: `${baseName(file.name)}-resized.${extensionForFormat(format)}`,
    };
  },

  async convert(file: File, input: ConvertInput): Promise<ProcessedImage> {
    const original = await toBuffer(file);
    const pipeline = sharp(original, { failOn: "none" });
    const buffer = await applyOutputFormat(
      pipeline,
      input.format,
      input.quality,
    ).toBuffer();

    return {
      buffer,
      contentType: contentTypeForFormat(input.format),
      filename: `${baseName(file.name)}.${extensionForFormat(input.format)}`,
    };
  },

  async rotate(file: File, input: RotateInput): Promise<ProcessedImage> {
    const original = await toBuffer(file);
    const detected = await detectFormat(original);
    const format = input.format ?? detected ?? "png";

    let pipeline = sharp(original, { failOn: "none" }).rotate(
      input.degrees ?? 0,
      { background: "#ffffff" },
    );
    if (input.flip) pipeline = pipeline.flip();
    if (input.flop) pipeline = pipeline.flop();

    const buffer = await applyOutputFormat(pipeline, format).toBuffer();

    return {
      buffer,
      contentType: contentTypeForFormat(format),
      filename: `${baseName(file.name)}-rotated.${extensionForFormat(format)}`,
    };
  },

  async exifMetadata(file: File): Promise<{
    width: number | null;
    height: number | null;
    format: string | null;
    space: string | null;
    hasAlpha: boolean;
    orientation: number | null;
    density: number | null;
    sizeBytes: number;
    exif: Record<string, unknown> | null;
  }> {
    const input = await toBuffer(file);
    const meta = await sharp(input, { failOn: "none" }).metadata();

    let exif: Record<string, unknown> | null = null;
    if (meta.exif) {
      try {
        const exifr = await import("exifr");
        const parsed = await exifr.default.parse(meta.exif, true);
        exif = (parsed as Record<string, unknown>) ?? null;
      } catch {
        exif = null;
      }
    }

    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
      format: meta.format ?? null,
      space: meta.space ?? null,
      hasAlpha: meta.hasAlpha ?? false,
      orientation: meta.orientation ?? null,
      density: meta.density ?? null,
      sizeBytes: file.size,
      exif,
    };
  },

  async stripExif(file: File): Promise<ProcessedImage> {
    const original = await toBuffer(file);
    const detected = (await detectFormat(original)) ?? "png";

    // sharp omits all embedded metadata (EXIF/ICC/IPTC/XMP) unless .withMetadata() is called.
    const pipeline = sharp(original, { failOn: "none" });
    const buffer = await applyOutputFormat(pipeline, detected).toBuffer();

    return {
      buffer,
      contentType: contentTypeForFormat(detected),
      filename: `${baseName(file.name)}-stripped.${extensionForFormat(detected)}`,
    };
  },

  async replaceBackground(
    file: File,
    input: BackgroundReplaceInput,
    backgroundFile?: File,
  ): Promise<ProcessedImage> {
    const original = await toBuffer(file);
    const backgroundImage = backgroundFile
      ? await toBuffer(backgroundFile)
      : undefined;

    const buffer = await replaceBackground(original, {
      mode: input.mode,
      color: input.color,
      blurSigma: input.blurSigma,
      extraAccurate: input.extraAccurate,
      backgroundImage,
    });

    return {
      buffer,
      contentType: "image/png",
      filename: `${baseName(file.name)}-bg-replaced.png`,
    };
  },

  async watermark(
    file: File,
    input: WatermarkInput,
    logoFile?: File,
  ): Promise<ProcessedImage> {
    const original = await toBuffer(file);
    const logoBuffer = logoFile ? await toBuffer(logoFile) : undefined;
    const detected = await detectFormat(original);

    const buffer = await applyWatermark(original, input, logoBuffer, detected);

    return {
      buffer,
      contentType: contentTypeForFormat(detected ?? "png"),
      filename: `${baseName(file.name)}-watermarked.${extensionForFormat(detected ?? "png")}`,
    };
  },
};
