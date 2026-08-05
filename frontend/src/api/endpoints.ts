/**
 * Centralised endpoint registry.
 *
 * Rules:
 *  - Static paths are plain strings.
 *  - Dynamic paths are arrow functions so callers never hand-concat strings.
 *  - The `as const` assertion lets TypeScript narrow literal types for
 *    the static entries.
 */
export const ENDPOINTS = {
  // ── Images (playground) ───────────────────────────────────────────────────
  images: {
    removeBackground: "/v1/images/remove-background",
    crop: "/v1/images/crop",
    resize: "/v1/images/resize",
    convert: "/v1/images/convert",
    rotate: "/v1/images/rotate",
    exif: "/v1/images/exif",
    exifStrip: "/v1/images/exif/strip",
    replaceBackground: "/v1/images/replace-background",
    watermark: "/v1/images/watermark",
  },
} as const;
