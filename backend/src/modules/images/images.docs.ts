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
              extraAccurate: {
                type: "boolean" as const,
                description:
                  "Runs a second flip-averaged pass for cleaner edges (~2x slower).",
              },
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
  resize: {
    tags: imagesTags,
    summary: "Resize an image",
    description:
      "Upload an image and resize it to exact dimensions or fit within bounds.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file"],
            properties: {
              file: { type: "string" as const, format: "binary" },
              width: { type: "integer" as const, minimum: 1 },
              height: { type: "integer" as const, minimum: 1 },
              fit: {
                type: "string" as const,
                enum: ["cover", "contain", "fill", "inside", "outside"],
              },
              format: {
                type: "string" as const,
                enum: ["png", "jpeg", "webp", "avif"],
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Resized image bytes",
        content: {
          "image/png": { schema: { type: "string" as const, format: "binary" } },
        },
      },
      400: {
        description: "Invalid upload or resize parameters",
        content: { "application/json": { schema: resolver(imagesErrorSchema) } },
      },
    },
  },
  convert: {
    tags: imagesTags,
    summary: "Convert & compress an image",
    description: "Upload an image and re-encode it as PNG/JPEG/WebP/AVIF.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file", "format"],
            properties: {
              file: { type: "string" as const, format: "binary" },
              format: {
                type: "string" as const,
                enum: ["png", "jpeg", "webp", "avif"],
              },
              quality: { type: "integer" as const, minimum: 1, maximum: 100 },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Converted image bytes",
        content: {
          "image/png": { schema: { type: "string" as const, format: "binary" } },
        },
      },
      400: {
        description: "Invalid upload or conversion parameters",
        content: { "application/json": { schema: resolver(imagesErrorSchema) } },
      },
    },
  },
  rotate: {
    tags: imagesTags,
    summary: "Rotate or flip an image",
    description: "Upload an image and rotate by an angle and/or flip/flop it.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file"],
            properties: {
              file: { type: "string" as const, format: "binary" },
              degrees: { type: "number" as const },
              flip: { type: "boolean" as const, description: "Vertical flip" },
              flop: { type: "boolean" as const, description: "Horizontal flip" },
              format: {
                type: "string" as const,
                enum: ["png", "jpeg", "webp", "avif"],
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Rotated image bytes",
        content: {
          "image/png": { schema: { type: "string" as const, format: "binary" } },
        },
      },
      400: {
        description: "Invalid upload or rotate parameters",
        content: { "application/json": { schema: resolver(imagesErrorSchema) } },
      },
    },
  },
  exifMetadata: {
    tags: imagesTags,
    summary: "Read image metadata",
    description: "Upload an image and receive its EXIF/basic metadata as JSON.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file"],
            properties: { file: { type: "string" as const, format: "binary" } },
          },
        },
      },
    },
    responses: {
      200: { description: "Parsed metadata" },
      400: {
        description: "Invalid upload",
        content: { "application/json": { schema: resolver(imagesErrorSchema) } },
      },
    },
  },
  stripExif: {
    tags: imagesTags,
    summary: "Strip image metadata",
    description:
      "Upload an image and receive it re-encoded with all EXIF/ICC/IPTC/XMP metadata removed.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file"],
            properties: { file: { type: "string" as const, format: "binary" } },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Image bytes with metadata stripped",
        content: {
          "image/png": { schema: { type: "string" as const, format: "binary" } },
        },
      },
      400: {
        description: "Invalid upload",
        content: { "application/json": { schema: resolver(imagesErrorSchema) } },
      },
    },
  },
  replaceBackground: {
    tags: imagesTags,
    summary: "Replace image background",
    description:
      "Removes the background then composites the subject onto a solid color, blurred original, or uploaded background image.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file", "mode"],
            properties: {
              file: { type: "string" as const, format: "binary" },
              mode: { type: "string" as const, enum: ["color", "blur", "image"] },
              color: { type: "string" as const, description: "Hex color for mode=color" },
              blurSigma: { type: "number" as const, description: "Blur strength for mode=blur" },
              backgroundFile: {
                type: "string" as const,
                format: "binary",
                description: "Required for mode=image",
              },
              extraAccurate: { type: "boolean" as const },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Composited PNG",
        content: {
          "image/png": { schema: { type: "string" as const, format: "binary" } },
        },
      },
      400: {
        description: "Invalid upload or parameters",
        content: { "application/json": { schema: resolver(imagesErrorSchema) } },
      },
    },
  },
  watermark: {
    tags: imagesTags,
    summary: "Apply a watermark",
    description:
      "Upload an image and overlay a text or logo watermark with configurable position, opacity, scale, and tiling.",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object" as const,
            required: ["file", "type", "position"],
            properties: {
              file: { type: "string" as const, format: "binary" },
              type: { type: "string" as const, enum: ["text", "logo"] },
              text: { type: "string" as const },
              fontSize: { type: "integer" as const },
              color: { type: "string" as const },
              logoFile: { type: "string" as const, format: "binary" },
              position: {
                type: "string" as const,
                enum: [
                  "top-left",
                  "top-center",
                  "top-right",
                  "middle-left",
                  "center",
                  "middle-right",
                  "bottom-left",
                  "bottom-center",
                  "bottom-right",
                ],
              },
              opacity: { type: "number" as const, minimum: 0.05, maximum: 1 },
              scale: { type: "number" as const, minimum: 0.02, maximum: 1 },
              margin: { type: "integer" as const, minimum: 0 },
              tile: { type: "boolean" as const },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Watermarked image bytes",
        content: {
          "image/png": { schema: { type: "string" as const, format: "binary" } },
        },
      },
      400: {
        description: "Invalid upload or watermark parameters",
        content: { "application/json": { schema: resolver(imagesErrorSchema) } },
      },
    },
  },
};
