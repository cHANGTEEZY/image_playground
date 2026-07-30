import sharp from "sharp";
import { removeBackgroundHighQuality } from "./background-removal";
import {
  type CropInput,
  type ProcessedImage,
} from "./images.types";

async function toBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

function baseName(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, "");
  return name || "image";
}

export const imagesService = {
  async removeBackground(file: File): Promise<ProcessedImage> {
    const original = await toBuffer(file);
    const buffer = await removeBackgroundHighQuality(original);

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
    let pipeline = sharp(input, { failOn: "none" }).extract({
      left: crop.left,
      top: crop.top,
      width: crop.width,
      height: crop.height,
    });

    if (format === "jpeg") {
      pipeline = pipeline.jpeg({ quality: 90 });
    } else if (format === "webp") {
      pipeline = pipeline.webp({ quality: 90 });
    } else {
      pipeline = pipeline.png();
    }

    const buffer = await pipeline.toBuffer();
    const contentType =
      format === "jpeg"
        ? "image/jpeg"
        : format === "webp"
          ? "image/webp"
          : "image/png";

    return {
      buffer,
      contentType,
      filename: `${baseName(file.name)}-cropped.${format === "jpeg" ? "jpg" : format}`,
    };
  },
};
