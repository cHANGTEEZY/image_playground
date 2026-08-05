import BackgroundReplacePage from "@/features/playground/background-replace";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/playground/background-replace",
)({
  component: BackgroundReplacePage,
});
