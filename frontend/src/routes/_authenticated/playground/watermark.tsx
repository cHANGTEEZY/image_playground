import WatermarkPage from "@/features/playground/watermark";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/playground/watermark")({
  component: WatermarkPage,
});
