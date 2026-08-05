import { useState } from "react";
import { Download, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useReplaceBackground } from "@/api/hooks/use-images";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type Mode = "color" | "blur" | "image";

export default function BackgroundReplacePage() {
  const [file, setFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("color");
  const [color, setColor] = useState("#3366ff");
  const [blurSigma, setBlurSigma] = useState(20);
  const [extraAccurate, setExtraAccurate] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const replaceBackground = useReplaceBackground();
  const resultUrl = useObjectUrl(result);
  const sourceUrl = useObjectUrl(file);

  async function handleProcess() {
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    if (mode === "image" && !backgroundFile) {
      toast.error("Upload a background image");
      return;
    }
    setResult(null);
    setError(null);
    setProgress(0);
    try {
      const blob = await replaceBackground.mutateAsync({
        file,
        mode,
        color: mode === "color" ? color : undefined,
        blurSigma: mode === "blur" ? blurSigma : undefined,
        backgroundFile: mode === "image" ? (backgroundFile ?? undefined) : undefined,
        extraAccurate,
        onProgress: setProgress,
      });
      setResult(blob);
      toast.success("Background replaced");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="Background Replace"
        description="Removes the background, then composites the subject onto a color, blurred backdrop, or your own image."
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
              }}
              disabled={replaceBackground.isPending}
            />

            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="color">Color</TabsTrigger>
                <TabsTrigger value="blur">Blur</TabsTrigger>
                <TabsTrigger value="image">Image</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "color" ? (
              <div className="space-y-2">
                <Label htmlFor="bg-color">Background color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="bg-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={replaceBackground.isPending}
                    className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                  />
                  <span className="text-sm text-muted-foreground">{color}</span>
                </div>
              </div>
            ) : null}

            {mode === "blur" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="blur-sigma">Blur strength</Label>
                  <span className="text-sm text-muted-foreground">{blurSigma}</span>
                </div>
                <Slider
                  id="blur-sigma"
                  min={1}
                  max={50}
                  step={1}
                  value={[blurSigma]}
                  disabled={replaceBackground.isPending}
                  onValueChange={([v]) => setBlurSigma(v)}
                />
              </div>
            ) : null}

            {mode === "image" ? (
              <div className="space-y-2">
                <Label>Background image</Label>
                <ImageDropzone
                  file={backgroundFile}
                  onFileChange={setBackgroundFile}
                  disabled={replaceBackground.isPending}
                  className="min-h-32"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="extra-accurate">Extra accurate</Label>
                <p className="text-xs text-muted-foreground">
                  Cleaner subject edges (~2x slower)
                </p>
              </div>
              <Switch
                id="extra-accurate"
                checked={extraAccurate}
                onCheckedChange={setExtraAccurate}
                disabled={replaceBackground.isPending}
              />
            </div>

            {replaceBackground.isPending ? <Progress value={progress} /> : null}

            <Button
              type="button"
              className="w-full"
              disabled={!file || replaceBackground.isPending}
              onClick={() => void handleProcess()}
            >
              {replaceBackground.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Wand2 />
                  Replace background
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Composited output — drag to compare</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultUrl && sourceUrl ? (
              <CompareSlider beforeSrc={sourceUrl} afterSrc={resultUrl} className="h-72" />
            ) : (
              <TransparencyBackdrop>
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Composited image will appear here
                </p>
              </TransparencyBackdrop>
            )}

            {error ? (
              <InlineError
                message={error}
                onRetry={() => void handleProcess()}
                retrying={replaceBackground.isPending}
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
                downloadBlob(result, `${base}-bg-replaced.png`);
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
