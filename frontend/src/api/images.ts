import { api, ApiError } from "@/lib/apiClient";
import { ENDPOINTS } from "./endpoints";
import type { AxiosError } from "axios";

export type CropPayload = {
  file: File;
  left: number;
  top: number;
  width: number;
  height: number;
  format?: "png" | "jpeg" | "webp";
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
  removeBackground: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append("file", file);
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
};
