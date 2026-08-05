import { z } from "zod";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
} from "./images.types";

export const cropFieldsSchema = z.object({
  left: z.coerce.number().int().min(0),
  top: z.coerce.number().int().min(0),
  width: z.coerce.number().int().positive(),
  height: z.coerce.number().int().positive(),
  format: z.enum(["png", "jpeg", "webp"]).optional().default("png"),
});

/** z.coerce.boolean() treats the string "false" as truthy; parse form-encoded booleans explicitly instead. */
const formBooleanSchema = z
  .union([z.boolean(), z.string(), z.undefined()])
  .transform((value) => value === true || value === "true" || value === "1");

export const removeBackgroundFieldsSchema = z.object({
  extraAccurate: formBooleanSchema,
});

const outputFormatSchema = z.enum(["png", "jpeg", "webp", "avif"]);

/** Upper bound for user-requested output dimensions; well above any real use case, guards against memory abuse. */
const MAX_OUTPUT_EDGE = 8000;

export const resizeFieldsSchema = z
  .object({
    width: z.coerce.number().int().min(1).max(MAX_OUTPUT_EDGE).optional(),
    height: z.coerce.number().int().min(1).max(MAX_OUTPUT_EDGE).optional(),
    fit: z
      .enum(["cover", "contain", "fill", "inside", "outside"])
      .optional()
      .default("inside"),
    format: outputFormatSchema.optional(),
  })
  .refine((data) => data.width !== undefined || data.height !== undefined, {
    message: "Provide at least a width or height.",
  });

export const convertFieldsSchema = z.object({
  format: outputFormatSchema,
  quality: z.coerce.number().int().min(1).max(100).optional().default(80),
});

export const rotateFieldsSchema = z
  .object({
    degrees: z.coerce.number().optional().default(0),
    flip: formBooleanSchema,
    flop: formBooleanSchema,
    format: outputFormatSchema.optional(),
  })
  .refine(
    (data) => data.degrees !== 0 || data.flip || data.flop,
    { message: "Provide a rotation angle or a flip/flop." },
  );

const hexColorSchema = z
  .string()
  .regex(/^#?[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex value.")
  .transform((value) => (value.startsWith("#") ? value : `#${value}`));

export const backgroundReplaceFieldsSchema = z.object({
  mode: z.enum(["color", "blur", "image"]),
  color: hexColorSchema.optional().default("#ffffff"),
  blurSigma: z.coerce.number().min(0.3).max(100).optional().default(20),
  extraAccurate: formBooleanSchema,
});

export const watermarkFieldsSchema = z
  .object({
    type: z.enum(["text", "logo"]),
    text: z.string().max(200).optional(),
    fontSize: z.coerce.number().int().min(8).max(400).optional().default(48),
    color: hexColorSchema.optional().default("#ffffff"),
    position: z
      .enum([
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "center",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ])
      .optional()
      .default("bottom-right"),
    opacity: z.coerce.number().min(0.05).max(1).optional().default(0.6),
    scale: z.coerce.number().min(0.02).max(1).optional().default(0.25),
    margin: z.coerce.number().int().min(0).max(500).optional().default(24),
    tile: formBooleanSchema,
  })
  .refine((data) => data.type !== "text" || !!data.text?.trim(), {
    message: "Watermark text is required.",
    path: ["text"],
  });

export function assertValidImageFile(file: File): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new ImageValidationError(
      `Unsupported file type "${file.type}". Allowed: JPEG, PNG, WebP.`,
    );
  }

  if (file.size <= 0) {
    throw new ImageValidationError("Uploaded file is empty.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError(
      `File exceeds the ${MAX_IMAGE_BYTES / (1024 * 1024)}MB size limit.`,
    );
  }
}

export class ImageValidationError extends Error {
  readonly code = "VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}
