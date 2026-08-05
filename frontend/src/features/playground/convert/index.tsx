import { useState } from "react";
import { Download, FileOutput, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConvertImage } from "@/api/hooks/use-images";
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
import { Slider } from "@/components/ui/slider";
import { getErrorMessage } from "@/utils/get-error-message";
import {
  downloadBlob,
  ImageDropzone,
  useObjectUrl,
} from "../components/image-dropzone";
import { InlineError } from "../components/inline-error";
import { PlaygroundPageHeader } from "../components/page-header";
import { SelectField } from "../components/select-field";

const FORMATS = ["png", "jpeg", "webp", "avif"] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ConvertImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("webp");
  const [quality, setQuality] = useState(80);
  const [result, setResult] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const convertImage = useConvertImage();
  const resultUrl = useObjectUrl(result);

  const showQuality = format !== "png";

  async function handleConvert() {
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    setResult(null);
    setError(null);
    setProgress(0);
    try {
      const blob = await convertImage.mutateAsync({
        file,
        format,
        quality: showQuality ? quality : undefined,
        onProgress: setProgress,
      });
      setResult(blob);
      toast.success("Image converted");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="Convert & Compress"
        description="Re-encode images as PNG, JPEG, WebP, or AVIF with an adjustable quality slider."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
            <CardDescription>
              {file ? `${formatBytes(file.size)} original` : "JPEG, PNG, or WebP"}
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
              disabled={convertImage.isPending}
            />

            <div className="space-y-2">
              <Label htmlFor="format">Output format</Label>
              <SelectField
                id="format"
                value={format}
                disabled={convertImage.isPending}
                onChange={(e) => setFormat(e.target.value as (typeof FORMATS)[number])}
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </SelectField>
            </div>

            {showQuality ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="quality">Quality</Label>
                  <span className="text-sm text-muted-foreground">{quality}</span>
                </div>
                <Slider
                  id="quality"
                  min={1}
                  max={100}
                  step={1}
                  value={[quality]}
                  disabled={convertImage.isPending}
                  onValueChange={([value]) => setQuality(value)}
                />
              </div>
            ) : null}

            {convertImage.isPending ? <Progress value={progress} /> : null}

            <Button
              type="button"
              className="w-full"
              disabled={!file || convertImage.isPending}
              onClick={() => void handleConvert()}
            >
              {convertImage.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Converting…
                </>
              ) : (
                <>
                  <FileOutput />
                  Convert image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>
              {result ? `${formatBytes(result.size)} output` : "Converted image output"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-input bg-muted/20">
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="Converted result"
                  className="max-h-72 max-w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Converted image will appear here
                </p>
              )}
            </div>

            {error ? (
              <InlineError
                message={error}
                onRetry={() => void handleConvert()}
                retrying={convertImage.isPending}
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
                const ext = format === "jpeg" ? "jpg" : format;
                downloadBlob(result, `${base}.${ext}`);
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
