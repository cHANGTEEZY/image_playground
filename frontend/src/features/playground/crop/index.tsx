import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Crop, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCropImage } from "@/api/hooks/use-images";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/utils/get-error-message";
import {
  downloadBlob,
  ImageDropzone,
  useObjectUrl,
} from "../components/image-dropzone";
import { InlineError } from "../components/inline-error";
import { PlaygroundPageHeader } from "../components/page-header";

const CROP_PRESETS = [
  { id: "free", label: "Freeform", aspect: undefined },
  { id: "square", label: "Square (1:1)", aspect: 1 },
  { id: "ig-story", label: "Story (9:16)", aspect: 9 / 16 },
  { id: "ig-portrait", label: "Portrait (4:5)", aspect: 4 / 5 },
  { id: "landscape", label: "Landscape (16:9)", aspect: 16 / 9 },
  { id: "x-header", label: "X Header (3:1)", aspect: 3 / 1 },
  { id: "yt-thumb", label: "YouTube (16:9)", aspect: 16 / 9 },
] as const;

export default function CropImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [preset, setPreset] = useState<(typeof CROP_PRESETS)[number]["id"]>(
    "free",
  );
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cropImage = useCropImage();
  const resultUrl = useObjectUrl(result);
  const activeAspect = CROP_PRESETS.find((p) => p.id === preset)?.aspect;

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleCrop() {
    if (!file || !croppedAreaPixels) {
      toast.error("Choose an image and adjust the crop box");
      return;
    }
    setResult(null);
    setError(null);
    try {
      const blob = await cropImage.mutateAsync({
        file,
        left: croppedAreaPixels.x,
        top: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
        format: "png",
      });
      setResult(blob);
      toast.success("Image cropped");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="Crop Image"
        description="Select a region and crop it on the server with sharp."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
            <CardDescription>Upload, then drag and zoom to frame the crop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageDropzone
              file={file}
              onFileChange={(next) => {
                setFile(next);
                setResult(null);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setCroppedAreaPixels(null);
              }}
              disabled={cropImage.isPending}
            />

            {imageUrl ? (
              <div className="space-y-3">
                <Tabs
                  value={preset}
                  onValueChange={(value) =>
                    setPreset(value as (typeof CROP_PRESETS)[number]["id"])
                  }
                >
                  <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                    {CROP_PRESETS.map((p) => (
                      <TabsTrigger
                        key={p.id}
                        value={p.id}
                        className="border border-input data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-none"
                      >
                        {p.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="relative h-72 overflow-hidden rounded-lg bg-muted">
                  <Cropper
                    image={imageUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={activeAspect}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zoom">Zoom</Label>
                  <Slider
                    id="zoom"
                    min={1}
                    max={3}
                    step={0.05}
                    value={[zoom]}
                    disabled={cropImage.isPending}
                    onValueChange={([value]) => setZoom(value)}
                  />
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={!file || !croppedAreaPixels || cropImage.isPending}
              onClick={() => void handleCrop()}
            >
              {cropImage.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Cropping…
                </>
              ) : (
                <>
                  <Crop />
                  Crop image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Cropped PNG from the API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-input bg-muted/20">
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="Cropped result"
                  className="max-h-72 max-w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Cropped image will appear here
                </p>
              )}
            </div>

            {error ? (
              <InlineError
                message={error}
                onRetry={() => void handleCrop()}
                retrying={cropImage.isPending}
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
                downloadBlob(result, `${base}-cropped.png`);
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
