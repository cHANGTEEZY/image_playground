import type { Context } from "hono";
import { ajApi } from "../../shared/utils/arcjet";
import { handleArcjetDecision } from "../../shared/utils/arcjet-deny";
import type { AppVariables } from "../../shared/types/app.types";
import { imagesService } from "./images.service";
import {
  assertValidImageFile,
  cropFieldsSchema,
  ImageValidationError,
} from "./images.validator";

type ImagesContext = Context<{ Variables: AppVariables }>;

function validationError(c: ImagesContext, message: string) {
  return c.json(
    {
      success: false,
      error: { code: "VALIDATION_ERROR", message },
      requestId: c.get("requestId"),
    },
    400,
  );
}

async function parseImageFile(c: ImagesContext): Promise<File | Response> {
  const body = await c.req.parseBody({ all: true });
  const file = body.file;

  if (!(file instanceof File)) {
    return validationError(c, 'Missing multipart field "file".');
  }

  try {
    assertValidImageFile(file);
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return validationError(c, error.message);
    }
    throw error;
  }

  return file;
}

function imageResponse(
  c: ImagesContext,
  result: { buffer: Buffer; contentType: string; filename: string },
) {
  return c.body(new Uint8Array(result.buffer), 200, {
    "Content-Type": result.contentType,
    "Content-Disposition": `inline; filename="${result.filename}"`,
    "Cache-Control": "no-store",
  });
}

export const imagesController = {
  async removeBackground(c: ImagesContext) {
    const decision = await ajApi.protect(c.req.raw, {
      correlationId: c.get("requestId"),
    });
    const denied = handleArcjetDecision(c, decision);
    if (denied) return denied;

    const parsed = await parseImageFile(c);
    if (parsed instanceof Response) return parsed;

    try {
      const result = await imagesService.removeBackground(parsed);
      return imageResponse(c, result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Background removal failed.";
      return c.json(
        {
          success: false,
          error: { code: "PROCESSING_ERROR", message },
          requestId: c.get("requestId"),
        },
        500,
      );
    }
  },

  async crop(c: ImagesContext) {
    const decision = await ajApi.protect(c.req.raw, {
      correlationId: c.get("requestId"),
    });
    const denied = handleArcjetDecision(c, decision);
    if (denied) return denied;

    const body = await c.req.parseBody({ all: true });
    const file = body.file;

    if (!(file instanceof File)) {
      return validationError(c, 'Missing multipart field "file".');
    }

    try {
      assertValidImageFile(file);
    } catch (error) {
      if (error instanceof ImageValidationError) {
        return validationError(c, error.message);
      }
      throw error;
    }

    const fields = cropFieldsSchema.safeParse({
      left: body.left,
      top: body.top,
      width: body.width,
      height: body.height,
      format: body.format,
    });

    if (!fields.success) {
      return validationError(
        c,
        fields.error.issues[0]?.message ?? "Invalid crop parameters.",
      );
    }

    try {
      const result = await imagesService.crop(file, fields.data);
      return imageResponse(c, result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Crop failed.";
      return c.json(
        {
          success: false,
          error: {
            code: message.includes("bounds")
              ? "VALIDATION_ERROR"
              : "PROCESSING_ERROR",
            message,
          },
          requestId: c.get("requestId"),
        },
        message.includes("bounds") ? 400 : 500,
      );
    }
  },
};
