import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/get-error-message";
import { imagesApi, type CropPayload } from "../images";

export function useRemoveBackground() {
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
    }) => imagesApi.removeBackground(file, onProgress),
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCropImage() {
  return useMutation({
    mutationFn: (payload: CropPayload) => imagesApi.crop(payload),
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}
