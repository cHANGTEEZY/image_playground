import ConvertImagePage from "@/features/playground/convert";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/playground/convert")({
  component: ConvertImagePage,
});
