/**
 * Erro base para todos os erros de API retornados pelo backend.
 * Carrega a mensagem amigável devolvida pelo servidor + o status HTTP.
 */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/**
 * HTTP 401 — token ausente, inválido ou expirado.
 * O cliente deve redirecionar para a tela de login.
 */
export class ApiAuthError extends ApiError {
  constructor(message = "Não autenticado") {
    super(message, 401)
    this.name = "ApiAuthError"
  }
}

/**
 * HTTP 403 — o usuário está autenticado mas não tem permissão
 * para acessar o recurso.
 */
export class ApiForbiddenError extends ApiError {
  constructor(message = "Acesso negado") {
    super(message, 403)
    this.name = "ApiForbiddenError"
  }
}

/**
 * HTTP 404 — recurso não encontrado.
 */
export class ApiNotFoundError extends ApiError {
  constructor(message = "Não encontrado") {
    super(message, 404)
    this.name = "ApiNotFoundError"
  }
}

/**
 * HTTP 409 — conflito (ex: recurso já existe, operação concorrente).
 */
export class ApiConflictError extends ApiError {
  constructor(message = "Conflito") {
    super(message, 409)
    this.name = "ApiConflictError"
  }
}

/**
 * HTTP 429 — rate limit excedido.
 */
export class ApiRateLimitError extends ApiError {
  constructor(message = "Muitas requisições. Tente novamente mais tarde.") {
    super(message, 429)
    this.name = "ApiRateLimitError"
  }
}

/**
 * HTTP 5xx — erro interno do servidor.
 */
export class ApiServerError extends ApiError {
  constructor(message = "Erro interno do servidor") {
    super(message, 500)
    this.name = "ApiServerError"
  }
}

/** Mapeia um status HTTP para a exceção tipada correspondente. */
export function createApiErrorFromStatus(message: string, status: number): ApiError {
  switch (status) {
    case 401:
      return new ApiAuthError(message)
    case 403:
      return new ApiForbiddenError(message)
    case 404:
      return new ApiNotFoundError(message)
    case 409:
      return new ApiConflictError(message)
    case 429:
      return new ApiRateLimitError(message)
    default:
      return status >= 500 ? new ApiServerError(message) : new ApiError(message, status)
  }
}
