import CropImagePage from "@/features/playground/crop";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/playground/crop")({
  component: CropImagePage,
});
