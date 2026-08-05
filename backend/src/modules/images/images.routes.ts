import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { AppVariables } from "../../shared/types/app.types";
import { imagesController } from "./images.controller";
import { imagesDocs } from "./images.docs";

/**
 * Image playground routes.
 * Left unauthenticated at the API layer because the frontend shell uses mock
 * localStorage auth (not Better Auth cookies). Arcjet still rate-limits these.
 * Pages remain behind the authenticated admin shell.
 */
export const imagesRoutes = new Hono<{ Variables: AppVariables }>();

imagesRoutes.post(
  "/remove-background",
  describeRoute(imagesDocs.removeBackground),
  (c) => imagesController.removeBackground(c),
);

imagesRoutes.post(
  "/crop",
  describeRoute(imagesDocs.crop),
  (c) => imagesController.crop(c),
);

imagesRoutes.post(
  "/resize",
  describeRoute(imagesDocs.resize),
  (c) => imagesController.resize(c),
);

imagesRoutes.post(
  "/convert",
  describeRoute(imagesDocs.convert),
  (c) => imagesController.convert(c),
);

imagesRoutes.post(
  "/rotate",
  describeRoute(imagesDocs.rotate),
  (c) => imagesController.rotate(c),
);

imagesRoutes.post(
  "/exif",
  describeRoute(imagesDocs.exifMetadata),
  (c) => imagesController.exifMetadata(c),
);

imagesRoutes.post(
  "/exif/strip",
  describeRoute(imagesDocs.stripExif),
  (c) => imagesController.stripExif(c),
);

imagesRoutes.post(
  "/replace-background",
  describeRoute(imagesDocs.replaceBackground),
  (c) => imagesController.replaceBackground(c),
);

imagesRoutes.post(
  "/watermark",
  describeRoute(imagesDocs.watermark),
  (c) => imagesController.watermark(c),
);
