import SvgPlaygroundPage from "@/features/playground/svg";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/playground/svg")({
  component: SvgPlaygroundPage,
});
