'use strict';

// src/errors.ts
var FormaTexError = class extends Error {
  constructor(message, statusCode, body = {}) {
    super(message);
    this.name = "FormaTexError";
    this.statusCode = statusCode;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var AuthenticationError = class extends FormaTexError {
  constructor(message, statusCode, body) {
    super(message, statusCode, body);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var CompilationError = class extends FormaTexError {
  constructor(message, log = "", statusCode, body) {
    super(message, statusCode, body);
    this.name = "CompilationError";
    this.log = log;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var RateLimitError = class extends FormaTexError {
  constructor(message, retryAfter = 0, statusCode, body) {
    super(message, statusCode, body);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var PlanLimitError = class extends FormaTexError {
  constructor(message, statusCode, body) {
    super(message, statusCode, body);
    this.name = "PlanLimitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};

// src/client.ts
var DEFAULT_BASE_URL = typeof process !== "undefined" && process.env?.FORMATEX_BASE_URL || "https://api.formatex.io";
var STAGING_BASE_URL = "https://api-test.formatex.zedmed.online";
function fileEntry(name, content) {
  if (Buffer.isBuffer(content)) {
    return { name, content: content.toString("base64") };
  }
  return { name, content };
}
var FormaTexClient = class {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.timeoutMs = options.timeout ?? 12e4;
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl.replace(/\/$/, "");
    } else if (options.staging) {
      this.baseUrl = STAGING_BASE_URL;
    } else {
      this.baseUrl = DEFAULT_BASE_URL;
    }
  }
  // ── HTTP helpers ────────────────────────────────────────────────────────────
  async _request(method, path, body, accept) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "X-API-Key": this.apiKey,
          ...body !== void 0 ? { "Content-Type": "application/json" } : {},
          ...accept !== void 0 ? { "Accept": accept } : {}
        },
        body: body !== void 0 ? JSON.stringify(body) : void 0,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }
  async _raiseForStatus(resp) {
    if (resp.ok) return;
    let body = {};
    try {
      body = await resp.clone().json();
    } catch {
    }
    const msg = body.error ?? resp.statusText ?? "Unknown error";
    if (resp.status === 401) throw new AuthenticationError(msg, 401, body);
    if (resp.status === 403) throw new PlanLimitError(msg, 403, body);
    if (resp.status === 422) {
      throw new CompilationError(msg, body.log ?? "", 422, body);
    }
    if (resp.status === 429) {
      const retryAfter = parseFloat(resp.headers.get("Retry-After") ?? "0");
      throw new RateLimitError(msg, retryAfter, 429, body);
    }
    throw new FormaTexError(msg, resp.status, body);
  }
  async _getJson(path) {
    const resp = await this._request("GET", path, void 0, "application/json");
    await this._raiseForStatus(resp);
    return resp.json();
  }
  async _getBytes(path) {
    const resp = await this._request("GET", path);
    await this._raiseForStatus(resp);
    return Buffer.from(await resp.arrayBuffer());
  }
  async _postJson(path, body) {
    const resp = await this._request("POST", path, body, "application/json");
    await this._raiseForStatus(resp);
    return resp.json();
  }
  async _postBytes(path, body) {
    const resp = await this._request("POST", path, body);
    await this._raiseForStatus(resp);
    return Buffer.from(await resp.arrayBuffer());
  }
  async _deleteJson(path) {
    const resp = await this._request("DELETE", path);
    await this._raiseForStatus(resp);
    if (resp.status === 204) return {};
    const text = await resp.text();
    if (!text) return {};
    return JSON.parse(text);
  }
  // ── Sync Compilation ────────────────────────────────────────────────────────
  /**
   * Compile LaTeX source to PDF synchronously.
   *
   * Resolves with the PDF bytes when compilation succeeds, or rejects with a
   * {@link CompilationError} when the LaTeX source contains errors.
   *
   * @example
   * ```ts
   * const result = await client.compile(`
   *   \\documentclass{article}
   *   \\begin{document}Hello world\\end{document}
   * `);
   * writeFileSync("out.pdf", result.pdf);
   * ```
   */
  async compile(latex, options = {}) {
    const { engine = "pdflatex", timeout, runs, files } = options;
    const body = { latex, engine };
    if (timeout != null) body.timeout = timeout;
    if (runs != null) body.runs = runs;
    if (files?.length) body.files = files;
    const data = await this._postJson("/api/v1/compile", body);
    return {
      pdf: Buffer.from(data.pdf, "base64"),
      engine: data.engine ?? engine,
      durationMs: data.duration ?? 0,
      sizeBytes: data.sizeBytes ?? 0,
      jobId: data.jobId ?? "",
      log: data.log ?? ""
    };
  }
  /**
   * Smart compile — auto-detects the required engine from the preamble.
   *
   * Inspects `\usepackage` declarations to pick the best engine automatically
   * (e.g. `fontspec` → xelatex, `luacode` → lualatex).
   */
  async compileSmart(latex, options = {}) {
    const { timeout, files } = options;
    const body = { latex, engine: "auto" };
    if (timeout != null) body.timeout = timeout;
    if (files?.length) body.files = files;
    const data = await this._postJson("/api/v1/compile/smart", body);
    return {
      pdf: Buffer.from(data.pdf, "base64"),
      engine: data.engine ?? "auto",
      durationMs: data.duration ?? 0,
      sizeBytes: data.sizeBytes ?? 0,
      jobId: data.jobId ?? "",
      log: data.log ?? "",
      analysis: data.analysis
    };
  }
  // ── Async Compilation ───────────────────────────────────────────────────────
  /**
   * Submit a compilation job to the background queue.
   *
   * Returns immediately with a job ID. Use {@link waitForJob} to block until
   * done, or poll {@link getJob} manually.
   */
  async asyncCompile(latex, options = {}) {
    const { engine = "pdflatex", timeout, runs, files } = options;
    const body = { latex, engine };
    if (timeout != null) body.timeout = timeout;
    if (runs != null) body.runs = runs;
    if (files?.length) body.files = files;
    const data = await this._postJson("/api/v1/compile/async", body);
    return {
      jobId: data.jobId,
      status: data.status ?? "pending"
    };
  }
  /** Poll the status of an async compilation job. */
  async getJob(jobId) {
    const data = await this._getJson(`/api/v1/jobs/${jobId}`);
    const result = data.result ?? {};
    return {
      jobId: data.id ?? jobId,
      status: data.status ?? "unknown",
      log: result.log ?? "",
      durationMs: result.duration ?? 0,
      error: result.error ?? "",
      success: result.success ?? false
    };
  }
  /**
   * Download the PDF for a completed async job.
   *
   * The PDF is **deleted from the server immediately after this call**
   * (one-time download). Save the bytes before calling again.
   */
  async getJobPdf(jobId) {
    return this._getBytes(`/api/v1/jobs/${jobId}/pdf`);
  }
  /** Fetch the compiler log for a finished async job. */
  async getJobLog(jobId) {
    const data = await this._getJson(`/api/v1/jobs/${jobId}/log`);
    return data.log ?? "";
  }
  /** Delete a job and its associated files from the server. */
  async deleteJob(jobId) {
    await this._deleteJson(`/api/v1/jobs/${jobId}`);
  }
  /**
   * Wait until an async job finishes and return the result.
   *
   * Polls {@link getJob} on an interval and automatically downloads the PDF
   * when the status reaches `"completed"`.
   *
   * @example
   * ```ts
   * const job  = await client.asyncCompile(latex);
   * const result = await client.waitForJob(job.jobId);
   * writeFileSync("out.pdf", result.pdf);
   * ```
   */
  async waitForJob(jobId, options = {}) {
    const { pollInterval = 2e3, timeout = 3e5 } = options;
    const deadline = Date.now() + timeout;
    for (; ; ) {
      const job = await this.getJob(jobId);
      if (job.status === "completed") {
        const pdf = await this.getJobPdf(jobId);
        return {
          pdf,
          engine: "",
          durationMs: job.durationMs,
          sizeBytes: pdf.length,
          jobId,
          log: job.log
        };
      }
      if (job.status === "failed") {
        throw new CompilationError(
          job.error || "compilation failed",
          job.log,
          422,
          { log: job.log, error: job.error }
        );
      }
      if (Date.now() >= deadline) {
        throw new FormaTexError(
          `job ${jobId} did not complete within ${timeout / 1e3}s (status: ${job.status})`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
  // ── Syntax / Lint ───────────────────────────────────────────────────────────
  /**
   * Validate LaTeX syntax without compiling (free, no quota cost).
   *
   * Uses a fast parser pass — does not invoke TeX.
   */
  async checkSyntax(latex) {
    const data = await this._postJson("/api/v1/compile/check", { latex });
    return {
      valid: data.valid ?? false,
      errors: data.errors ?? [],
      warnings: data.warnings ?? []
    };
  }
  /**
   * Run ChkTeX static analysis on LaTeX source.
   *
   * Returns structured diagnostics with line numbers, severity levels, and
   * ChkTeX error codes. Does **not** count against your monthly quota.
   *
   * @example
   * ```ts
   * const result = await client.lint(latex);
   * for (const d of result.diagnostics) {
   *   console.log(`Line ${d.line}: [${d.severity}] ${d.message}`);
   * }
   * ```
   */
  async lint(latex) {
    const data = await this._postJson("/api/v1/lint", { latex });
    const diagnostics = (data.diagnostics ?? []).map((d) => {
      const diag = d;
      return {
        line: diag.line ?? 0,
        column: diag.column ?? 0,
        severity: diag.severity ?? "warning",
        message: diag.message ?? "",
        source: diag.source ?? "chktex",
        code: diag.code ?? ""
      };
    });
    const errorCount = diagnostics.filter((d) => d.severity === "error").length;
    const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
    return {
      diagnostics,
      durationMs: data.duration ?? 0,
      errorCount,
      warningCount,
      valid: errorCount === 0
    };
  }
  // ── Convert ─────────────────────────────────────────────────────────────────
  /**
   * Convert LaTeX source to a Word document (DOCX) via pandoc.
   *
   * Math is converted to native OOXML equations. Counts against your monthly
   * compilation quota (engine logged as `pandoc`).
   *
   * @example
   * ```ts
   * const result = await client.convert(latex);
   * writeFileSync("document.docx", result.docx);
   * ```
   */
  async convert(latex, options = {}) {
    const { files } = options;
    const body = { latex };
    if (files?.length) body.files = files;
    const docx = await this._postBytes("/api/v1/convert", body);
    return { docx, sizeBytes: docx.length };
  }
  // ── Usage / Engines ─────────────────────────────────────────────────────────
  /** Get current month's compilation usage for this API key. */
  async getUsage() {
    const data = await this._getJson("/api/v1/usage");
    const comp = data.compilations ?? {};
    const period = data.period ?? {};
    return {
      plan: data.plan ?? "",
      compilationsUsed: comp.used ?? data.compilationsUsed ?? 0,
      compilationsLimit: comp.limit ?? data.compilationsLimit ?? 0,
      periodStart: period.start ?? data.periodStart ?? "",
      periodEnd: period.end ?? data.periodEnd ?? "",
      raw: data
    };
  }
  /** List available compilation engines and their status. */
  async listEngines() {
    const data = await this._getJson("/api/v1/engines");
    return data.engines ?? [];
  }
};

exports.AuthenticationError = AuthenticationError;
exports.CompilationError = CompilationError;
exports.DEFAULT_BASE_URL = DEFAULT_BASE_URL;
exports.FormaTexClient = FormaTexClient;
exports.FormaTexError = FormaTexError;
exports.PlanLimitError = PlanLimitError;
exports.RateLimitError = RateLimitError;
exports.STAGING_BASE_URL = STAGING_BASE_URL;
exports.fileEntry = fileEntry;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map