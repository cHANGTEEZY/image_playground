/**
 * API Client
 *
 * Features:
 *  - Exponential backoff retry on network errors, 5xx, and 429
 *  - Unified error normalization via ApiError
 *  - File upload with progress callback
 *  - Cancellable requests via AbortController
 *  - Raw instance exposed for advanced use cases
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

// ─── Environment config ───────────────────────────────────────────────────────

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8000/api";
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 300;

// ─── Module augmentation ──────────────────────────────────────────────────────

declare module "axios" {
  interface InternalAxiosRequestConfig {
    /** Number of retry attempts made so far for this request. */
    _retryCount?: number;
  }
}

// ─── Custom error ─────────────────────────────────────────────────────────────

export interface ValidationErrors {
  [field: string]: string[];
}

/**
 * Normalized error thrown by every api.* helper on non-2xx responses.
 * Check helpers like `.isUnauthorized()` avoid spreading magic numbers.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly validationErrors: ValidationErrors | null;
  readonly originalError: AxiosError;

  constructor(
    message: string,
    status: number,
    code: string,
    validationErrors: ValidationErrors | null,
    originalError: AxiosError,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.validationErrors = validationErrors;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  isUnauthorized() {
    return this.status === 401;
  }
  isForbidden() {
    return this.status === 403;
  }
  isNotFound() {
    return this.status === 404;
  }
  isConflict() {
    return this.status === 409;
  }
  isValidation() {
    return this.status === 422;
  }
  isServerError() {
    return this.status >= 500;
  }
  isTimeout() {
    return this.code === "TIMEOUT";
  }
  isNetwork() {
    return this.code === "NETWORK_ERROR";
  }
}

/** Type-guard for catching ApiError in unknown catch blocks. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// ─── Retry helpers ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: AxiosError, attempt: number): boolean {
  if (attempt >= MAX_RETRIES) return false;
  if (!error.response) return true;
  const { status } = error.response;
  return status === 429 || (status >= 500 && status !== 501);
}

function retryDelay(attempt: number, error: AxiosError): number {
  const retryAfterHeader = error.response?.headers["retry-after"];
  if (retryAfterHeader) return Number(retryAfterHeader) * 1_000;
  return RETRY_BASE_DELAY_MS * 2 ** attempt + Math.random() * 100;
}

// ─── Error normalizer ─────────────────────────────────────────────────────────

function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;

  let message: string;
  let code: string;
  let validationErrors: ValidationErrors | null = null;

  if (!error.response) {
    const isTimeout =
      error.code === "ECONNABORTED" || error.code === "ERR_CANCELED";
    message = isTimeout
      ? "Request timed out. Please try again."
      : "Network error. Please check your connection.";
    code = isTimeout ? "TIMEOUT" : "NETWORK_ERROR";
  } else {
    message = String(
      data?.message ??
        data?.error ??
        error.message ??
        "An unexpected error occurred",
    );
    code = String(data?.code ?? `HTTP_${status}`);
    validationErrors = (data?.errors as ValidationErrors) ?? null;
  }

  return new ApiError(message, status, code, validationErrors, error);
}

// ─── Axios instance ───────────────────────────────────────────────────────────

const httpClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config._retryCount ??= 0;
    return config;
  },
  (error) => Promise.reject(error),
);

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    if (!config) return Promise.reject(normalizeError(error));

    const attempt = config._retryCount ?? 0;
    if (isRetryable(error, attempt)) {
      config._retryCount = attempt + 1;
      await sleep(retryDelay(attempt, error));
      return httpClient(config);
    }

    return Promise.reject(normalizeError(error));
  },
);

// ─── Typed request helpers ────────────────────────────────────────────────────

export type RequestConfig = Omit<AxiosRequestConfig, "url" | "method">;

async function get<T>(url: string, config?: RequestConfig): Promise<T> {
  const res = await httpClient.get<T>(url, config);
  return res.data;
}

async function post<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<T> {
  const res = await httpClient.post<T>(url, data, config);
  return res.data;
}

async function put<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<T> {
  const res = await httpClient.put<T>(url, data, config);
  return res.data;
}

async function patch<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<T> {
  const res = await httpClient.patch<T>(url, data, config);
  return res.data;
}

async function del<T = void>(url: string, config?: RequestConfig): Promise<T> {
  const res = await httpClient.delete<T>(url, config);
  return res.data;
}

async function upload<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  config?: RequestConfig,
): Promise<T> {
  const res = await httpClient.post<T>(url, formData, {
    ...config,
    headers: { ...config?.headers, "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
  return res.data;
}

function cancellable<T>(url: string, config?: RequestConfig) {
  const controller = new AbortController();
  const request = get<T>(url, { ...config, signal: controller.signal });
  const cancel = (reason?: string) => controller.abort(reason);
  return { request, cancel };
}

export const api = {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  cancellable,
  instance: httpClient,
} as const;
