import { useEffect, useState } from "react";
import { Download, Loader2, Scaling } from "lucide-react";
import { toast } from "sonner";
import { useResizeImage } from "@/api/hooks/use-images";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/utils/get-error-message";
import {
  downloadBlob,
  ImageDropzone,
  useObjectUrl,
} from "../components/image-dropzone";
import { InlineError } from "../components/inline-error";
import { PlaygroundPageHeader } from "../components/page-header";
import { SelectField } from "../components/select-field";

const FIT_MODES = ["inside", "outside", "cover", "contain", "fill"] as const;
const FORMATS = ["png", "jpeg", "webp", "avif"] as const;

export default function ResizeImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [fit, setFit] = useState<(typeof FIT_MODES)[number]>("inside");
  const [format, setFormat] = useState<(typeof FORMATS)[number] | "">("");
  const [result, setResult] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const resizeImage = useResizeImage();
  const resultUrl = useObjectUrl(result);
  const sourceUrl = useObjectUrl(file);

  useEffect(() => {
    if (!sourceUrl) {
      setNaturalSize(null);
      setWidth("");
      setHeight("");
      return;
    }
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setWidth(String(img.naturalWidth));
      setHeight(String(img.naturalHeight));
    };
    img.src = sourceUrl;
  }, [sourceUrl]);

  function onWidthChange(value: string) {
    setWidth(value);
    if (lockAspect && naturalSize && value) {
      const ratio = naturalSize.h / naturalSize.w;
      setHeight(String(Math.round(Number(value) * ratio)));
    }
  }

  function onHeightChange(value: string) {
    setHeight(value);
    if (lockAspect && naturalSize && value) {
      const ratio = naturalSize.w / naturalSize.h;
      setWidth(String(Math.round(Number(value) * ratio)));
    }
  }

  function applyPercent(percent: number) {
    if (!naturalSize) return;
    const w = Math.max(1, Math.round((naturalSize.w * percent) / 100));
    const h = Math.max(1, Math.round((naturalSize.h * percent) / 100));
    setWidth(String(w));
    setHeight(String(h));
  }

  async function handleResize() {
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    if (!width && !height) {
      toast.error("Set a width or height");
      return;
    }
    setResult(null);
    setError(null);
    setProgress(0);
    try {
      const blob = await resizeImage.mutateAsync({
        file,
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        fit,
        format: format || undefined,
        onProgress: setProgress,
      });
      setResult(blob);
      toast.success("Image resized");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="Resize / Scale"
        description="Resize to exact dimensions or a percentage, with aspect-ratio locking."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
            <CardDescription>
              {naturalSize
                ? `Original: ${naturalSize.w} × ${naturalSize.h}px`
                : "JPEG, PNG, or WebP"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageDropzone
              file={file}
              onFileChange={(next) => {
                setFile(next);
                setResult(null);
                setError(null);
              }}
              disabled={resizeImage.isPending}
            />

            <div className="flex flex-wrap gap-2">
              {[25, 50, 75, 100, 150, 200].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!naturalSize || resizeImage.isPending}
                  onClick={() => applyPercent(pct)}
                >
                  {pct}%
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  min={1}
                  value={width}
                  disabled={resizeImage.isPending}
                  onChange={(e) => onWidthChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  min={1}
                  value={height}
                  disabled={resizeImage.isPending}
                  onChange={(e) => onHeightChange(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5">
              <Label htmlFor="lock-aspect" className="cursor-pointer">
                Lock aspect ratio
              </Label>
              <Switch
                id="lock-aspect"
                checked={lockAspect}
                onCheckedChange={setLockAspect}
                disabled={resizeImage.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fit">Fit mode</Label>
                <SelectField
                  id="fit"
                  value={fit}
                  disabled={resizeImage.isPending}
                  onChange={(e) => setFit(e.target.value as (typeof FIT_MODES)[number])}
                >
                  {FIT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <SelectField
                  id="format"
                  value={format}
                  disabled={resizeImage.isPending}
                  onChange={(e) =>
                    setFormat(e.target.value as (typeof FORMATS)[number] | "")
                  }
                >
                  <option value="">Keep original</option>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f.toUpperCase()}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            {resizeImage.isPending ? <Progress value={progress} /> : null}

            <Button
              type="button"
              className="w-full"
              disabled={!file || resizeImage.isPending}
              onClick={() => void handleResize()}
            >
              {resizeImage.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Resizing…
                </>
              ) : (
                <>
                  <Scaling />
                  Resize image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Resized image output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-input bg-muted/20">
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="Resized result"
                  className="max-h-72 max-w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Resized image will appear here
                </p>
              )}
            </div>

            {error ? (
              <InlineError
                message={error}
                onRetry={() => void handleResize()}
                retrying={resizeImage.isPending}
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
                const ext = format || "png";
                downloadBlob(result, `${base}-resized.${ext === "jpeg" ? "jpg" : ext}`);
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
