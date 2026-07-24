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
