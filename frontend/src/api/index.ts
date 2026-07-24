// Core client (use for one-off calls)
export { api, tokenStore, isApiError, ApiError } from "@/lib/apiClient";
export type { RequestConfig, ValidationErrors } from "@/lib/apiClient";

// Shared types
export * from "./types";

// Endpoint constants
export * from "./endpoints";

// Resource modules
export * from "./auth";
export * from "./users";
export * from "./images";

// TanStack Query hooks
export * from "./hooks/use-auth";
export * from "./hooks/use-users";
export * from "./hooks/use-images";
