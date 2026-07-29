// Supabase client + config
export { getSupabaseClient, setSupabaseClient, getSupabase, getConfig } from "./supabase"
export type { ApiConfig } from "./supabase"

// HTTP API client
export { apiFetch } from "./api-fetch"

// Tipos de erro
export type {
  ApiError as ApiErrorType,
  ApiAuthError as ApiAuthErrorType,
  ApiForbiddenError as ApiForbiddenErrorType,
  ApiNotFoundError as ApiNotFoundErrorType,
  ApiConflictError as ApiConflictErrorType,
  ApiRateLimitError as ApiRateLimitErrorType,
  ApiServerError as ApiServerErrorType,
} from "./api-fetch"
export {
  ApiError,
  ApiAuthError,
  ApiForbiddenError,
  ApiNotFoundError,
  ApiConflictError,
  ApiRateLimitError,
  ApiServerError,
  createApiErrorFromStatus,
} from "./errors"

// Domain clients
export * from "./tickets"
export * from "./kanban"
export * from "./chat"
export * from "./meetings"
export * from "./activities"
