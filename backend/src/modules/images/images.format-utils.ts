import type sharp from "sharp";
import type { OutputFormat } from "./images.types";

export function contentTypeForFormat(format: OutputFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    default:
      return "image/png";
  }
}

export function extensionForFormat(format: OutputFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

/** Applies the requested output encoder to a sharp pipeline in place. */
export function applyOutputFormat(
  pipeline: sharp.Sharp,
  format: OutputFormat,
  quality?: number,
): sharp.Sharp {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({ quality: quality ?? 90 });
    case "webp":
      return pipeline.webp({ quality: quality ?? 90 });
    case "avif":
      return pipeline.avif({ quality: quality ?? 60 });
    default:
      return pipeline.png(
        quality !== undefined
          ? { quality, compressionLevel: 8 }
          : undefined,
      );
  }
}
