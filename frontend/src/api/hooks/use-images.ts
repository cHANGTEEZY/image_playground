import { useMutation } from "@tanstack/react-query";
import {
  imagesApi,
  type BackgroundReplacePayload,
  type ConvertPayload,
  type CropPayload,
  type ResizePayload,
  type RotatePayload,
  type WatermarkPayload,
} from "../images";

export function useRemoveBackground() {
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
      extraAccurate,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
      extraAccurate?: boolean;
    }) => imagesApi.removeBackground(file, onProgress, extraAccurate),
  });
}

export function useCropImage() {
  return useMutation({
    mutationFn: (payload: CropPayload) => imagesApi.crop(payload),
  });
}

export function useResizeImage() {
  return useMutation({
    mutationFn: (payload: ResizePayload) => imagesApi.resize(payload),
  });
}

export function useConvertImage() {
  return useMutation({
    mutationFn: (payload: ConvertPayload) => imagesApi.convert(payload),
  });
}

export function useRotateImage() {
  return useMutation({
    mutationFn: (payload: RotatePayload) => imagesApi.rotate(payload),
  });
}

export function useExifMetadata() {
  return useMutation({
    mutationFn: (file: File) => imagesApi.exif(file),
  });
}

export function useStripExif() {
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
    }) => imagesApi.stripExif(file, onProgress),
  });
}

export function useReplaceBackground() {
  return useMutation({
    mutationFn: (payload: BackgroundReplacePayload) =>
      imagesApi.replaceBackground(payload),
  });
}

export function useWatermarkImage() {
  return useMutation({
    mutationFn: (payload: WatermarkPayload) => imagesApi.watermark(payload),
  });
}
