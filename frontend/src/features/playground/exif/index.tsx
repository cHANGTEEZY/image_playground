import { useState } from "react";
import { Download, Eraser, FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useExifMetadata, useStripExif } from "@/api/hooks/use-images";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExifMetadata } from "@/api/images";
import { getErrorMessage } from "@/utils/get-error-message";
import {
  downloadBlob,
  ImageDropzone,
  useObjectUrl,
} from "../components/image-dropzone";
import { InlineError } from "../components/inline-error";
import { PlaygroundPageHeader } from "../components/page-header";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function basicRows(meta: ExifMetadata) {
  return [
    { label: "Dimensions", value: meta.width && meta.height ? `${meta.width} × ${meta.height}px` : "—" },
    { label: "Format", value: meta.format?.toUpperCase() ?? "—" },
    { label: "Color space", value: meta.space ?? "—" },
    { label: "Has alpha", value: meta.hasAlpha ? "Yes" : "No" },
    { label: "Orientation", value: meta.orientation ?? "—" },
    { label: "Density (DPI)", value: meta.density ?? "—" },
    { label: "File size", value: formatBytes(meta.sizeBytes) },
  ];
}

export default function ExifToolPage() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<ExifMetadata | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exifMetadata = useExifMetadata();
  const stripExif = useStripExif();
  const resultUrl = useObjectUrl(result);

  async function handleRead(target: File) {
    setError(null);
    try {
      const data = await exifMetadata.mutateAsync(target);
      setMetadata(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleStrip() {
    if (!file) return;
    setResult(null);
    setError(null);
    try {
      const blob = await stripExif.mutateAsync({ file });
      setResult(blob);
      toast.success("Metadata stripped");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const exifEntries = metadata?.exif ? Object.entries(metadata.exif) : [];

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="EXIF Viewer & Strip"
        description="Inspect embedded EXIF/metadata, or download a copy with it removed for privacy."
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
                setMetadata(null);
                setResult(null);
                setError(null);
                if (next) void handleRead(next);
              }}
              disabled={exifMetadata.isPending || stripExif.isPending}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!file || exifMetadata.isPending}
              onClick={() => file && void handleRead(file)}
            >
              {exifMetadata.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Reading…
                </>
              ) : (
                <>
                  <FileSearch />
                  Read metadata
                </>
              )}
            </Button>

            <Button
              type="button"
              className="w-full"
              disabled={!file || stripExif.isPending}
              onClick={() => void handleStrip()}
            >
              {stripExif.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Stripping…
                </>
              ) : (
                <>
                  <Eraser />
                  Strip metadata
                </>
              )}
            </Button>

            {result && resultUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-lg border border-input p-2">
                  <img
                    src={resultUrl}
                    alt="Stripped preview"
                    className="size-12 rounded object-cover"
                  />
                  <p className="text-xs text-muted-foreground">
                    Metadata removed — {formatBytes(result.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const base = file?.name.replace(/\.[^.]+$/, "") || "image";
                    const ext = result.type.split("/")[1] ?? "png";
                    downloadBlob(result, `${base}-stripped.${ext === "jpeg" ? "jpg" : ext}`);
                  }}
                >
                  <Download />
                  Download stripped copy
                </Button>
              </div>
            ) : null}

            {error ? (
              <InlineError
                message={error}
                onRetry={() => (file ? void handleRead(file) : undefined)}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>
              {metadata ? "Basic properties + embedded EXIF" : "Upload an image to inspect it"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metadata ? (
              <>
                <div className="rounded-lg border border-input px-3">
                  {basicRows(metadata).map((row) => (
                    <MetadataRow key={row.label} label={row.label} value={row.value} />
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">EXIF tags</p>
                  {exifEntries.length > 0 ? (
                    <div className="max-h-80 overflow-auto rounded-lg border border-input px-3">
                      {exifEntries.map(([key, value]) => (
                        <MetadataRow
                          key={key}
                          label={key}
                          value={typeof value === "object" ? JSON.stringify(value) : String(value)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No embedded EXIF tags found in this image.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="px-1 text-sm text-muted-foreground">
                Metadata will appear here once you upload an image.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
