import ResizeImagePage from "@/features/playground/resize";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/playground/resize")({
  component: ResizeImagePage,
});
