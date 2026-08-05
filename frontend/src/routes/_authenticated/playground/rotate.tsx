import RotateImagePage from "@/features/playground/rotate";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/playground/rotate")({
  component: RotateImagePage,
});
