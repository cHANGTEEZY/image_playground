import { Link } from "@tanstack/react-router";
import { Crop, Eraser, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const tools = [
  {
    title: "Remove Background",
    description: "AI background removal powered by the Hono API and sharp.",
    to: "/playground/remove-background" as const,
    icon: Eraser,
  },
  {
    title: "Crop Image",
    description: "Interactive cropper with server-side sharp extract.",
    to: "/playground/crop" as const,
    icon: Crop,
  },
  {
    title: "SVG Tools",
    description: "Preview SVG markup and generate React Native Expo code.",
    to: "/playground/svg" as const,
    icon: Code2,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Image Playground
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Remove backgrounds, crop images, and turn SVG markup into Expo-ready
          React Native components.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.to} className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <tool.icon className="size-5" />
              </div>
              <CardTitle className="text-lg">{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild className="w-full">
                <Link to={tool.to}>Open tool</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
