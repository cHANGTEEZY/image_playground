export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_EDGE = 2048;

export type OutputFormat = "png" | "jpeg" | "webp" | "avif";

export type CropInput = {
  left: number;
  top: number;
  width: number;
  height: number;
  format?: "png" | "jpeg" | "webp";
};

export type ResizeInput = {
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  format?: OutputFormat;
};

export type ConvertInput = {
  format: OutputFormat;
  quality?: number;
};

export type RotateInput = {
  degrees?: number;
  flip?: boolean;
  flop?: boolean;
  format?: OutputFormat;
};

export type BackgroundReplaceMode = "color" | "blur" | "image";

export type BackgroundReplaceInput = {
  mode: BackgroundReplaceMode;
  color?: string;
  blurSigma?: number;
  extraAccurate?: boolean;
};

export type WatermarkSourceType = "text" | "logo";

export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type WatermarkInput = {
  type: WatermarkSourceType;
  text?: string;
  fontSize?: number;
  color?: string;
  position: WatermarkPosition;
  opacity: number;
  scale: number;
  margin: number;
  tile: boolean;
};

export type ProcessedImage = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};
