import ExifToolPage from "@/features/playground/exif";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/playground/exif")({
  component: ExifToolPage,
});
