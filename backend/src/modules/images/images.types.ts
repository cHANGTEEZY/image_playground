export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_EDGE = 2048;

export type CropInput = {
  left: number;
  top: number;
  width: number;
  height: number;
  format?: "png" | "jpeg" | "webp";
};

export type ProcessedImage = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};
