import { useState } from "react";
import { Download, Loader2, Stamp } from "lucide-react";
import { toast } from "sonner";
import { useWatermarkImage } from "@/api/hooks/use-images";
import type { WatermarkPosition } from "@/api/images";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/get-error-message";
import {
  downloadBlob,
  ImageDropzone,
  useObjectUrl,
} from "../components/image-dropzone";
import { InlineError } from "../components/inline-error";
import { PlaygroundPageHeader } from "../components/page-header";

const POSITIONS: WatermarkPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

function PositionGrid({
  value,
  onChange,
  disabled,
}: {
  value: WatermarkPosition;
  onChange: (position: WatermarkPosition) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid w-fit grid-cols-3 gap-1.5 rounded-lg border border-input p-1.5">
      {POSITIONS.map((position) => (
        <button
          key={position}
          type="button"
          disabled={disabled}
          onClick={() => onChange(position)}
          aria-label={position}
          className={cn(
            "size-7 rounded-md border border-transparent bg-muted transition-colors hover:bg-muted-foreground/20",
            value === position && "border-primary bg-primary",
          )}
        />
      ))}
    </div>
  );
}

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [type, setType] = useState<"text" | "logo">("text");
  const [text, setText] = useState("© Your Brand");
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState("#ffffff");
  const [position, setPosition] = useState<WatermarkPosition>("bottom-right");
  const [opacity, setOpacity] = useState(0.6);
  const [scale, setScale] = useState(0.25);
  const [margin, setMargin] = useState(24);
  const [tile, setTile] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const watermarkImage = useWatermarkImage();
  const resultUrl = useObjectUrl(result);

  async function handleApply() {
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    if (type === "text" && !text.trim()) {
      toast.error("Enter watermark text");
      return;
    }
    if (type === "logo" && !logoFile) {
      toast.error("Upload a logo image");
      return;
    }
    setResult(null);
    setError(null);
    setProgress(0);
    try {
      const blob = await watermarkImage.mutateAsync({
        file,
        type,
        text: type === "text" ? text : undefined,
        fontSize: type === "text" ? fontSize : undefined,
        color: type === "text" ? color : undefined,
        logoFile: type === "logo" ? (logoFile ?? undefined) : undefined,
        position,
        opacity,
        scale,
        margin,
        tile,
        onProgress: setProgress,
      });
      setResult(blob);
      toast.success("Watermark applied");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="Watermark"
        description="Overlay text or a logo with adjustable position, opacity, scale, and tiling."
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
              disabled={watermarkImage.isPending}
            />

            <Tabs value={type} onValueChange={(v) => setType(v as "text" | "logo")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="logo">Logo</TabsTrigger>
              </TabsList>
            </Tabs>

            {type === "text" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="wm-text">Text</Label>
                  <Input
                    id="wm-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={watermarkImage.isPending}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="font-size">Font size</Label>
                    <Input
                      id="font-size"
                      type="number"
                      min={8}
                      max={400}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      disabled={watermarkImage.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wm-color">Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="wm-color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        disabled={watermarkImage.isPending}
                        className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Logo image</Label>
                <ImageDropzone
                  file={logoFile}
                  onFileChange={setLogoFile}
                  disabled={watermarkImage.isPending}
                  className="min-h-32"
                />
              </div>
            )}

            <div className="flex flex-wrap items-end gap-6">
              <div className="space-y-2">
                <Label>Position</Label>
                <PositionGrid
                  value={position}
                  onChange={setPosition}
                  disabled={tile || watermarkImage.isPending}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="tile"
                  checked={tile}
                  onCheckedChange={setTile}
                  disabled={watermarkImage.isPending}
                />
                <Label htmlFor="tile" className="cursor-pointer">
                  Tile across image
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="opacity">Opacity</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
                <Slider
                  id="opacity"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={[opacity]}
                  disabled={watermarkImage.isPending}
                  onValueChange={([v]) => setOpacity(v)}
                />
              </div>
              {type === "logo" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="scale">Size</Label>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(scale * 100)}%
                    </span>
                  </div>
                  <Slider
                    id="scale"
                    min={0.02}
                    max={1}
                    step={0.01}
                    value={[scale]}
                    disabled={watermarkImage.isPending}
                    onValueChange={([v]) => setScale(v)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="margin">Margin</Label>
                  <span className="text-xs text-muted-foreground">{margin}px</span>
                </div>
                <Slider
                  id="margin"
                  min={0}
                  max={200}
                  step={4}
                  value={[margin]}
                  disabled={watermarkImage.isPending}
                  onValueChange={([v]) => setMargin(v)}
                />
              </div>
            </div>

            {watermarkImage.isPending ? <Progress value={progress} /> : null}

            <Button
              type="button"
              className="w-full"
              disabled={!file || watermarkImage.isPending}
              onClick={() => void handleApply()}
            >
              {watermarkImage.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Applying…
                </>
              ) : (
                <>
                  <Stamp />
                  Apply watermark
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Watermarked image output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-input bg-muted/20">
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="Watermarked result"
                  className="max-h-72 max-w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Watermarked image will appear here
                </p>
              )}
            </div>

            {error ? (
              <InlineError
                message={error}
                onRetry={() => void handleApply()}
                retrying={watermarkImage.isPending}
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
                const ext = result.type.split("/")[1] ?? "png";
                downloadBlob(result, `${base}-watermarked.${ext === "jpeg" ? "jpg" : ext}`);
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
