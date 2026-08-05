import { api, ApiError } from "@/lib/apiClient";
import { ENDPOINTS } from "./endpoints";
import type { AxiosError } from "axios";

export type OutputFormat = "png" | "jpeg" | "webp" | "avif";

export type CropPayload = {
  file: File;
  left: number;
  top: number;
  width: number;
  height: number;
  format?: "png" | "jpeg" | "webp";
  onProgress?: (percent: number) => void;
};

export type ResizePayload = {
  file: File;
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  format?: OutputFormat;
  onProgress?: (percent: number) => void;
};

export type ConvertPayload = {
  file: File;
  format: OutputFormat;
  quality?: number;
  onProgress?: (percent: number) => void;
};

export type RotatePayload = {
  file: File;
  degrees?: number;
  flip?: boolean;
  flop?: boolean;
  format?: OutputFormat;
  onProgress?: (percent: number) => void;
};

export type ExifMetadata = {
  width: number | null;
  height: number | null;
  format: string | null;
  space: string | null;
  hasAlpha: boolean;
  orientation: number | null;
  density: number | null;
  sizeBytes: number;
  exif: Record<string, unknown> | null;
};

export type BackgroundReplacePayload = {
  file: File;
  mode: "color" | "blur" | "image";
  color?: string;
  blurSigma?: number;
  backgroundFile?: File;
  extraAccurate?: boolean;
  onProgress?: (percent: number) => void;
};

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

export type WatermarkPayload = {
  file: File;
  type: "text" | "logo";
  text?: string;
  fontSize?: number;
  color?: string;
  logoFile?: File;
  position: WatermarkPosition;
  opacity: number;
  scale: number;
  margin: number;
  tile: boolean;
  onProgress?: (percent: number) => void;
};

async function messageFromBlobError(error: unknown): Promise<string> {
  if (error instanceof ApiError) {
    const data = error.originalError.response?.data;
    if (data instanceof Blob) {
      try {
        const json = JSON.parse(await data.text()) as {
          error?: { message?: string };
          message?: string;
        };
        return json.error?.message ?? json.message ?? error.message;
      } catch {
        return error.message;
      }
    }
    return error.message;
  }

  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as AxiosError;
    const data = axiosError.response?.data;
    if (data instanceof Blob) {
      try {
        const json = JSON.parse(await data.text()) as {
          error?: { message?: string };
          message?: string;
        };
        return json.error?.message ?? json.message ?? axiosError.message;
      } catch {
        return axiosError.message;
      }
    }
  }

  if (error instanceof Error) return error.message;
  return "Image processing failed";
}

async function postImageBlob(
  url: string,
  formData: FormData,
  timeoutMs: number,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  try {
    const res = await api.instance.post(url, formData, {
      timeout: timeoutMs,
      responseType: "blob",
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });

    const contentType = String(res.headers["content-type"] ?? "");
    if (contentType.includes("application/json")) {
      const text = await (res.data as Blob).text();
      let message = "Image processing failed";
      try {
        const json = JSON.parse(text) as {
          error?: { message?: string };
          message?: string;
        };
        message = json.error?.message ?? json.message ?? message;
      } catch {
        // keep default message
      }
      throw new Error(message);
    }

    return res.data as Blob;
  } catch (error) {
    throw new Error(await messageFromBlobError(error));
  }
}

export const imagesApi = {
  removeBackground: (
    file: File,
    onProgress?: (percent: number) => void,
    extraAccurate?: boolean,
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (extraAccurate) form.append("extraAccurate", "true");
    return postImageBlob(
      ENDPOINTS.images.removeBackground,
      form,
      120_000,
      onProgress,
    );
  },

  crop: ({
    file,
    left,
    top,
    width,
    height,
    format = "png",
    onProgress,
  }: CropPayload) => {
    const form = new FormData();
    form.append("file", file);
    form.append("left", String(Math.round(left)));
    form.append("top", String(Math.round(top)));
    form.append("width", String(Math.round(width)));
    form.append("height", String(Math.round(height)));
    form.append("format", format);
    return postImageBlob(ENDPOINTS.images.crop, form, 60_000, onProgress);
  },

  resize: ({ file, width, height, fit, format, onProgress }: ResizePayload) => {
    const form = new FormData();
    form.append("file", file);
    if (width) form.append("width", String(Math.round(width)));
    if (height) form.append("height", String(Math.round(height)));
    if (fit) form.append("fit", fit);
    if (format) form.append("format", format);
    return postImageBlob(ENDPOINTS.images.resize, form, 60_000, onProgress);
  },

  convert: ({ file, format, quality, onProgress }: ConvertPayload) => {
    const form = new FormData();
    form.append("file", file);
    form.append("format", format);
    if (quality !== undefined) form.append("quality", String(Math.round(quality)));
    return postImageBlob(ENDPOINTS.images.convert, form, 60_000, onProgress);
  },

  rotate: ({ file, degrees, flip, flop, format, onProgress }: RotatePayload) => {
    const form = new FormData();
    form.append("file", file);
    if (degrees !== undefined) form.append("degrees", String(degrees));
    if (flip) form.append("flip", "true");
    if (flop) form.append("flop", "true");
    if (format) form.append("format", format);
    return postImageBlob(ENDPOINTS.images.rotate, form, 60_000, onProgress);
  },

  exif: async (file: File): Promise<ExifMetadata> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.upload<{ success: boolean; data: ExifMetadata }>(
      ENDPOINTS.images.exif,
      form,
    );
    return res.data;
  },

  stripExif: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return postImageBlob(ENDPOINTS.images.exifStrip, form, 60_000, onProgress);
  },

  replaceBackground: ({
    file,
    mode,
    color,
    blurSigma,
    backgroundFile,
    extraAccurate,
    onProgress,
  }: BackgroundReplacePayload) => {
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    if (color) form.append("color", color);
    if (blurSigma !== undefined) form.append("blurSigma", String(blurSigma));
    if (backgroundFile) form.append("backgroundFile", backgroundFile);
    if (extraAccurate) form.append("extraAccurate", "true");
    return postImageBlob(
      ENDPOINTS.images.replaceBackground,
      form,
      120_000,
      onProgress,
    );
  },

  watermark: ({
    file,
    type,
    text,
    fontSize,
    color,
    logoFile,
    position,
    opacity,
    scale,
    margin,
    tile,
    onProgress,
  }: WatermarkPayload) => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    if (text) form.append("text", text);
    if (fontSize !== undefined) form.append("fontSize", String(fontSize));
    if (color) form.append("color", color);
    if (logoFile) form.append("logoFile", logoFile);
    form.append("position", position);
    form.append("opacity", String(opacity));
    form.append("scale", String(scale));
    form.append("margin", String(margin));
    if (tile) form.append("tile", "true");
    return postImageBlob(ENDPOINTS.images.watermark, form, 60_000, onProgress);
  },
};
