import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Check, ClipboardCopy, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlaygroundPageHeader } from "../components/page-header";
import { svgToExpoComponent } from "./svg-to-expo";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none">
  <rect width="120" height="120" rx="24" fill="#0F766E"/>
  <circle cx="60" cy="52" r="22" fill="#CCFBF1"/>
  <path d="M36 88c8-12 40-12 48 0" stroke="#CCFBF1" stroke-width="8" stroke-linecap="round"/>
</svg>`;

export default function SvgPlaygroundPage() {
  const [svgCode, setSvgCode] = useState(SAMPLE_SVG);
  const [expoCode, setExpoCode] = useState("");
  const [copied, setCopied] = useState(false);

  const sanitizedPreview = useMemo(() => {
    const trimmed = svgCode.trim();
    if (!trimmed) return "";
    return DOMPurify.sanitize(trimmed, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
  }, [svgCode]);

  function generateExpoCode() {
    const trimmed = svgCode.trim();
    if (!trimmed) {
      toast.error("Paste SVG markup first");
      return;
    }

    try {
      const code = svgToExpoComponent(trimmed, "GeneratedIcon");
      setExpoCode(code);
      toast.success("Expo code generated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to transform SVG";
      toast.error(message);
    }
  }

  async function copyExpoCode() {
    if (!expoCode) return;
    await navigator.clipboard.writeText(expoCode);
    setCopied(true);
    toast.success("Copied to clipboard");
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <PlaygroundPageHeader
        title="SVG Tools"
        description="Paste SVG markup to preview it, then generate a React Native Expo component."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SVG source</CardTitle>
            <CardDescription>Paste raw SVG markup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svg-source">SVG code</Label>
              <Textarea
                id="svg-source"
                value={svgCode}
                onChange={(e) => setSvgCode(e.target.value)}
                spellCheck={false}
                className="min-h-64 font-mono text-xs leading-relaxed"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={generateExpoCode}>
                <Code2 />
                Generate Expo code
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSvgCode(SAMPLE_SVG);
                  setExpoCode("");
                }}
              >
                Reset sample
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <CardDescription>Sanitized SVG render</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-input bg-muted/20 p-6">
              {sanitizedPreview ? (
                <div
                  className="max-w-full [&_svg]:h-auto [&_svg]:max-h-56 [&_svg]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  SVG preview will appear here
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>React Native Expo output</CardTitle>
            <CardDescription>
              Converts SVG tags into react-native-svg components for Expo
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!expoCode}
            onClick={() => void copyExpoCode()}
          >
            {copied ? <Check /> : <ClipboardCopy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-md border border-input bg-muted/30 p-4 text-xs leading-relaxed">
            <code>
              {expoCode ||
                '// Click "Generate Expo code" to transform your SVG into a React Native component.'}
            </code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
