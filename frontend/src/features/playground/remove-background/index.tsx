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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/utils/get-error-message";
import {
  downloadBlob,
  ImageDropzone,
  useObjectUrl,
} from "../components/image-dropzone";
import { CompareSlider } from "../components/compare-slider";
import { InlineError } from "../components/inline-error";
import { PlaygroundPageHeader } from "../components/page-header";
import { TransparencyBackdrop } from "../components/transparency-backdrop";

export default function RemoveBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [extraAccurate, setExtraAccurate] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const removeBackground = useRemoveBackground();
  const resultUrl = useObjectUrl(result);
  const sourceUrl = useObjectUrl(file);

  async function handleProcess() {
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    setResult(null);
    setError(null);
    setProgress(0);
    try {
      const blob = await removeBackground.mutateAsync({
        file,
        extraAccurate,
        onProgress: setProgress,
      });
      setResult(blob);
      toast.success("Background removed");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="Remove Background"
        description="Upload a photo and remove the background with high-quality AI segmentation (IS-Net medium model, guided-filter edge refinement, defringing)."
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
                setError(null);
              }}
              disabled={removeBackground.isPending}
            />

            <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="extra-accurate">Extra accurate</Label>
                <p className="text-xs text-muted-foreground">
                  Averages a flipped pass for cleaner edges (~2x slower)
                </p>
              </div>
              <Switch
                id="extra-accurate"
                checked={extraAccurate}
                onCheckedChange={setExtraAccurate}
                disabled={removeBackground.isPending}
              />
            </div>

            {removeBackground.isPending ? (
              <Progress value={progress} />
            ) : null}

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
            <CardDescription>Transparent PNG output — drag to compare</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultUrl && sourceUrl ? (
              <CompareSlider
                beforeSrc={sourceUrl}
                afterSrc={resultUrl}
                transparentAfter
                className="h-72"
              />
            ) : (
              <TransparencyBackdrop>
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Processed image will appear here
                </p>
              </TransparencyBackdrop>
            )}

            {error ? (
              <InlineError
                message={error}
                onRetry={() => void handleProcess()}
                retrying={removeBackground.isPending}
              />
            ) : null}

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
