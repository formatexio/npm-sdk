/** Base exception for all FormaTex errors. */
export class FormaTexError extends Error {
  readonly statusCode: number | undefined;
  readonly body: Record<string, unknown>;

  constructor(
    message: string,
    statusCode?: number,
    body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "FormaTexError";
    this.statusCode = statusCode;
    this.body = body;
    // Restore prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Invalid or missing API key (HTTP 401). */
export class AuthenticationError extends FormaTexError {
  constructor(message: string, statusCode?: number, body?: Record<string, unknown>) {
    super(message, statusCode, body);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** LaTeX compilation failed (HTTP 422). Check `.log` for the compiler output. */
export class CompilationError extends FormaTexError {
  readonly log: string;

  constructor(
    message: string,
    log = "",
    statusCode?: number,
    body?: Record<string, unknown>,
  ) {
    super(message, statusCode, body);
    this.name = "CompilationError";
    this.log = log;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Too many requests (HTTP 429). Check `.retryAfter` for seconds to wait. */
export class RateLimitError extends FormaTexError {
  readonly retryAfter: number;

  constructor(
    message: string,
    retryAfter = 0,
    statusCode?: number,
    body?: Record<string, unknown>,
  ) {
    super(message, statusCode, body);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Plan limit exceeded (HTTP 403). Upgrade your plan to continue. */
export class PlanLimitError extends FormaTexError {
  constructor(message: string, statusCode?: number, body?: Record<string, unknown>) {
    super(message, statusCode, body);
    this.name = "PlanLimitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
