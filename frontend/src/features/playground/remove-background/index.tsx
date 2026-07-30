import { useState } from "react";
import { Download, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useRemoveBackground } from "@/api/hooks/use-images";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  downloadBlob,
  ImageDropzone,
  useObjectUrl,
} from "../components/image-dropzone";
import { PlaygroundPageHeader } from "../components/page-header";

export default function RemoveBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const removeBackground = useRemoveBackground();
  const resultUrl = useObjectUrl(result);

  async function handleProcess() {
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    setResult(null);
    const blob = await removeBackground.mutateAsync({ file });
    setResult(blob);
    toast.success("Background removed");
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="Remove Background"
        description="Upload a photo and remove the background with high-quality AI segmentation (IS-Net medium model, Lanczos mask upscaling)."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Original</CardTitle>
            <CardDescription>JPEG, PNG, or WebP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageDropzone
              file={file}
              onFileChange={(next) => {
                setFile(next);
                setResult(null);
              }}
              disabled={removeBackground.isPending}
            />
            <Button
              type="button"
              className="w-full"
              disabled={!file || removeBackground.isPending}
              onClick={() => void handleProcess()}
            >
              {removeBackground.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Wand2 />
                  Remove background
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Transparent PNG output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-input bg-[linear-gradient(45deg,#e5e5e5_25%,transparent_25%),linear-gradient(-45deg,#e5e5e5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e5e5_75%),linear-gradient(-45deg,transparent_75%,#e5e5e5_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] dark:bg-[linear-gradient(45deg,#333_25%,transparent_25%),linear-gradient(-45deg,#333_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#333_75%),linear-gradient(-45deg,transparent_75%,#333_75%)]">
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="Background removed"
                  className="max-h-72 max-w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Processed image will appear here
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!result}
              onClick={() => {
                if (!result) return;
                const base = file?.name.replace(/\.[^.]+$/, "") || "image";
                downloadBlob(result, `${base}-no-bg.png`);
              }}
            >
              <Download />
              Download PNG
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
