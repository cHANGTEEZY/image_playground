import type { Context } from "hono";
import { ajApi } from "../../shared/utils/arcjet";
import { handleArcjetDecision } from "../../shared/utils/arcjet-deny";
import type { AppVariables } from "../../shared/types/app.types";
import { imagesService } from "./images.service";
import {
  assertValidImageFile,
  backgroundReplaceFieldsSchema,
  convertFieldsSchema,
  cropFieldsSchema,
  ImageValidationError,
  removeBackgroundFieldsSchema,
  resizeFieldsSchema,
  rotateFieldsSchema,
  watermarkFieldsSchema,
} from "./images.validator";

type ImagesContext = Context<{ Variables: AppVariables }>;
type ParsedBody = Record<string, string | File | (string | File)[]>;

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

function processingError(c: ImagesContext, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const isValidation =
    message.includes("bounds") ||
    message.includes("required") ||
    message.includes("Could not read");

  return c.json(
    {
      success: false,
      error: { code: isValidation ? "VALIDATION_ERROR" : "PROCESSING_ERROR", message },
      requestId: c.get("requestId"),
    },
    isValidation ? 400 : 500,
  );
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

async function guard(c: ImagesContext) {
  const decision = await ajApi.protect(c.req.raw, {
    correlationId: c.get("requestId"),
  });
  return handleArcjetDecision(c, decision);
}

function extractFile(body: ParsedBody, field: string): File | null {
  const value = body[field];
  return value instanceof File ? value : null;
}

async function requireValidFile(
  c: ImagesContext,
  body: ParsedBody,
  field = "file",
): Promise<File | Response> {
  const file = extractFile(body, field);
  if (!file) {
    return validationError(c, `Missing multipart field "${field}".`);
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

export const imagesController = {
  async removeBackground(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

    const fields = removeBackgroundFieldsSchema.safeParse({
      extraAccurate: body.extraAccurate,
    });
    if (!fields.success) {
      return validationError(
        c,
        fields.error.issues[0]?.message ?? "Invalid request parameters.",
      );
    }

    try {
      const result = await imagesService.removeBackground(file, {
        extraAccurate: fields.data.extraAccurate,
      });
      return imageResponse(c, result);
    } catch (error) {
      return processingError(c, error, "Background removal failed.");
    }
  },

  async crop(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

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
      return processingError(c, error, "Crop failed.");
    }
  },

  async resize(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

    const fields = resizeFieldsSchema.safeParse({
      width: body.width,
      height: body.height,
      fit: body.fit,
      format: body.format,
    });
    if (!fields.success) {
      return validationError(
        c,
        fields.error.issues[0]?.message ?? "Invalid resize parameters.",
      );
    }

    try {
      const result = await imagesService.resize(file, fields.data);
      return imageResponse(c, result);
    } catch (error) {
      return processingError(c, error, "Resize failed.");
    }
  },

  async convert(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

    const fields = convertFieldsSchema.safeParse({
      format: body.format,
      quality: body.quality,
    });
    if (!fields.success) {
      return validationError(
        c,
        fields.error.issues[0]?.message ?? "Invalid conversion parameters.",
      );
    }

    try {
      const result = await imagesService.convert(file, fields.data);
      return imageResponse(c, result);
    } catch (error) {
      return processingError(c, error, "Conversion failed.");
    }
  },

  async rotate(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

    const fields = rotateFieldsSchema.safeParse({
      degrees: body.degrees,
      flip: body.flip,
      flop: body.flop,
      format: body.format,
    });
    if (!fields.success) {
      return validationError(
        c,
        fields.error.issues[0]?.message ?? "Invalid rotate parameters.",
      );
    }

    try {
      const result = await imagesService.rotate(file, fields.data);
      return imageResponse(c, result);
    } catch (error) {
      return processingError(c, error, "Rotate failed.");
    }
  },

  async exifMetadata(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

    try {
      const data = await imagesService.exifMetadata(file);
      return c.json({ success: true, data, requestId: c.get("requestId") });
    } catch (error) {
      return processingError(c, error, "Reading metadata failed.");
    }
  },

  async stripExif(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

    try {
      const result = await imagesService.stripExif(file);
      return imageResponse(c, result);
    } catch (error) {
      return processingError(c, error, "Stripping metadata failed.");
    }
  },

  async replaceBackground(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

    const fields = backgroundReplaceFieldsSchema.safeParse({
      mode: body.mode,
      color: body.color,
      blurSigma: body.blurSigma,
      extraAccurate: body.extraAccurate,
    });
    if (!fields.success) {
      return validationError(
        c,
        fields.error.issues[0]?.message ?? "Invalid background-replace parameters.",
      );
    }

    let backgroundFile: File | undefined;
    if (fields.data.mode === "image") {
      const bgFile = await requireValidFile(c, body, "backgroundFile");
      if (bgFile instanceof Response) return bgFile;
      backgroundFile = bgFile;
    }

    try {
      const result = await imagesService.replaceBackground(
        file,
        fields.data,
        backgroundFile,
      );
      return imageResponse(c, result);
    } catch (error) {
      return processingError(c, error, "Background replace failed.");
    }
  },

  async watermark(c: ImagesContext) {
    const denied = await guard(c);
    if (denied) return denied;

    const body = (await c.req.parseBody({ all: true })) as ParsedBody;
    const file = await requireValidFile(c, body);
    if (file instanceof Response) return file;

    const fields = watermarkFieldsSchema.safeParse({
      type: body.type,
      text: body.text,
      fontSize: body.fontSize,
      color: body.color,
      position: body.position,
      opacity: body.opacity,
      scale: body.scale,
      margin: body.margin,
      tile: body.tile,
    });
    if (!fields.success) {
      return validationError(
        c,
        fields.error.issues[0]?.message ?? "Invalid watermark parameters.",
      );
    }

    let logoFile: File | undefined;
    if (fields.data.type === "logo") {
      const logo = await requireValidFile(c, body, "logoFile");
      if (logo instanceof Response) return logo;
      logoFile = logo;
    }

    try {
      const result = await imagesService.watermark(file, fields.data, logoFile);
      return imageResponse(c, result);
    } catch (error) {
      return processingError(c, error, "Watermark failed.");
    }
  },
};
