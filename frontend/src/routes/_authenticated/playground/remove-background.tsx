import RemoveBackgroundPage from "@/features/playground/remove-background";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/playground/remove-background",
)({
  component: RemoveBackgroundPage,
});
