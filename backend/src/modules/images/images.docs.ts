import { resolver } from "hono-openapi";
import { z } from "zod";

export const imagesTags = ["Images"];

export const imagesErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  requestId: z.string(),
});

export const imagesDocs = {
  removeBackground: {
    tags: imagesTags,
    summary: "Remove image background",
    description:
      "Upload an image (JPEG/PNG/WebP) and receive a PNG with the background removed.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file"],
            properties: {
              file: { type: "string" as const, format: "binary" },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "PNG with transparent background",
        content: {
          "image/png": {
            schema: { type: "string" as const, format: "binary" },
          },
        },
      },
      400: {
        description: "Invalid upload",
        content: {
          "application/json": {
            schema: resolver(imagesErrorSchema),
          },
        },
      },
    },
  },
  crop: {
    tags: imagesTags,
    summary: "Crop an image",
    description:
      "Upload an image with crop coordinates and receive the cropped image.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file", "left", "top", "width", "height"],
            properties: {
              file: { type: "string" as const, format: "binary" },
              left: { type: "integer" as const, minimum: 0 },
              top: { type: "integer" as const, minimum: 0 },
              width: { type: "integer" as const, minimum: 1 },
              height: { type: "integer" as const, minimum: 1 },
              format: {
                type: "string" as const,
                enum: ["png", "jpeg", "webp"],
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Cropped image bytes",
        content: {
          "image/png": {
            schema: { type: "string" as const, format: "binary" },
          },
          "image/jpeg": {
            schema: { type: "string" as const, format: "binary" },
          },
          "image/webp": {
            schema: { type: "string" as const, format: "binary" },
          },
        },
      },
      400: {
        description: "Invalid upload or crop region",
        content: {
          "application/json": {
            schema: resolver(imagesErrorSchema),
          },
        },
      },
    },
  },
};
