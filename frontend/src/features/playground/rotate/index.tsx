import { useState } from "react";
import {
  Download,
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { useRotateImage } from "@/api/hooks/use-images";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getErrorMessage } from "@/utils/get-error-message";
import {
  downloadBlob,
  ImageDropzone,
  useObjectUrl,
} from "../components/image-dropzone";
import { InlineError } from "../components/inline-error";
import { PlaygroundPageHeader } from "../components/page-header";

export default function RotateImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [degrees, setDegrees] = useState(0);
  const [flip, setFlip] = useState(false);
  const [flop, setFlop] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rotateImage = useRotateImage();
  const resultUrl = useObjectUrl(result);
  const sourceUrl = useObjectUrl(file);

  const previewRotation = degrees % 360;
  const hasChanges = previewRotation !== 0 || flip || flop;

  async function handleRotate() {
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    if (!hasChanges) {
      toast.error("Rotate or flip the image first");
      return;
    }
    setResult(null);
    setError(null);
    try {
      const blob = await rotateImage.mutateAsync({
        file,
        degrees,
        flip,
        flop,
      });
      setResult(blob);
      toast.success("Image transformed");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="Rotate / Flip"
        description="Rotate by 90° increments (or a custom angle) and flip horizontally or vertically."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
            <CardDescription>JPEG, PNG, or WebP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageDropzone
              file={file}
              onFileChange={(next) => {
                setFile(next);
                setResult(null);
                setError(null);
                setDegrees(0);
                setFlip(false);
                setFlop(false);
              }}
              disabled={rotateImage.isPending}
            />

            {sourceUrl ? (
              <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-muted/20 p-4">
                <img
                  src={sourceUrl}
                  alt="Preview"
                  className="max-h-48 max-w-full object-contain transition-transform duration-200"
                  style={{
                    transform: `rotate(${previewRotation}deg) scaleX(${flop ? -1 : 1}) scaleY(${flip ? -1 : 1})`,
                  }}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={rotateImage.isPending}
                onClick={() => setDegrees((d) => d - 90)}
              >
                <RotateCcw />
                Rotate left
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={rotateImage.isPending}
                onClick={() => setDegrees((d) => d + 90)}
              >
                <RotateCw />
                Rotate right
              </Button>
              <Button
                type="button"
                variant={flop ? "default" : "outline"}
                disabled={rotateImage.isPending}
                onClick={() => setFlop((v) => !v)}
              >
                <FlipHorizontal2 />
                Flip horizontal
              </Button>
              <Button
                type="button"
                variant={flip ? "default" : "outline"}
                disabled={rotateImage.isPending}
                onClick={() => setFlip((v) => !v)}
              >
                <FlipVertical2 />
                Flip vertical
              </Button>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={!file || rotateImage.isPending || !hasChanges}
              onClick={() => void handleRotate()}
            >
              {rotateImage.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <RotateCw />
                  Apply
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Transformed image output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-input bg-muted/20">
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="Rotated result"
                  className="max-h-72 max-w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Transformed image will appear here
                </p>
              )}
            </div>

            {error ? (
              <InlineError
                message={error}
                onRetry={() => void handleRotate()}
                retrying={rotateImage.isPending}
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
                downloadBlob(result, `${base}-rotated.png`);
              }}
            >
              <Download />
              Download image
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
