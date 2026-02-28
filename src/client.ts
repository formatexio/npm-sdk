import {
  FormaTexError,
  AuthenticationError,
  CompilationError,
  RateLimitError,
  PlanLimitError,
} from "./errors.js";
import type {
  CompileResult,
  AsyncJob,
  JobResult,
  LintResult,
  LintDiagnostic,
  SyntaxResult,
  ConvertResult,
  UsageStats,
  FileEntry,
  CompileOptions,
  SmartCompileOptions,
  ConvertOptions,
  WaitOptions,
  FormaTexClientOptions,
} from "./types.js";

export const DEFAULT_BASE_URL: string =
  (typeof process !== "undefined" && process.env?.FORMATEX_BASE_URL) ||
  "https://api.formatex.io";

export const STAGING_BASE_URL = "https://api-test.formatex.zedmed.online";

/**
 * Build a companion-file entry for multi-file compilation.
 *
 * @param name - Filename as referenced in the LaTeX source (e.g. `"fig.png"`)
 * @param content - `Buffer` of raw bytes, or an already-encoded base64 string
 *
 * @example
 * ```ts
 * import { readFileSync } from "fs";
 *
 * const result = await client.compile(latex, {
 *   files: [
 *     fileEntry("logo.png", readFileSync("assets/logo.png")),
 *     fileEntry("refs.bib", readFileSync("refs.bib")),
 *   ],
 * });
 * ```
 */
export function fileEntry(name: string, content: Buffer | string): FileEntry {
  if (Buffer.isBuffer(content)) {
    return { name, content: content.toString("base64") };
  }
  return { name, content }; // treated as already base64
}

/**
 * High-level client for the FormaTex LaTeX-to-PDF API.
 *
 * Requires Node.js ≥ 18 (uses native `fetch`).
 *
 * @example
 * ```ts
 * import { FormaTexClient } from "formatex";
 * import { writeFileSync } from "fs";
 *
 * const client = new FormaTexClient("fx_your_api_key");
 * const result = await client.compile("\\documentclass{article}...");
 * writeFileSync("out.pdf", result.pdf);
 * ```
 */
export class FormaTexClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(apiKey: string, options: FormaTexClientOptions = {}) {
    this.apiKey = apiKey;
    this.timeoutMs = options.timeout ?? 120_000;

    if (options.baseUrl) {
      this.baseUrl = options.baseUrl.replace(/\/$/, "");
    } else if (options.staging) {
      this.baseUrl = STAGING_BASE_URL;
    } else {
      this.baseUrl = DEFAULT_BASE_URL;
    }
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  private async _request(method: string, path: string, body?: unknown, accept?: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "X-API-Key": this.apiKey,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(accept !== undefined ? { "Accept": accept } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async _raiseForStatus(resp: Response): Promise<void> {
    if (resp.ok) return;

    let body: Record<string, unknown> = {};
    try {
      body = (await resp.clone().json()) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }
    const msg = (body.error as string | undefined) ?? resp.statusText ?? "Unknown error";

    if (resp.status === 401) throw new AuthenticationError(msg, 401, body);
    if (resp.status === 403) throw new PlanLimitError(msg, 403, body);
    if (resp.status === 422) {
      throw new CompilationError(msg, (body.log as string | undefined) ?? "", 422, body);
    }
    if (resp.status === 429) {
      const retryAfter = parseFloat(resp.headers.get("Retry-After") ?? "0");
      throw new RateLimitError(msg, retryAfter, 429, body);
    }
    throw new FormaTexError(msg, resp.status, body);
  }

  private async _getJson<T = Record<string, unknown>>(path: string): Promise<T> {
    const resp = await this._request("GET", path, undefined, "application/json");
    await this._raiseForStatus(resp);
    return resp.json() as Promise<T>;
  }

  private async _getBytes(path: string): Promise<Buffer> {
    const resp = await this._request("GET", path);
    await this._raiseForStatus(resp);
    return Buffer.from(await resp.arrayBuffer());
  }

  private async _postJson<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
    const resp = await this._request("POST", path, body, "application/json");
    await this._raiseForStatus(resp);
    return resp.json() as Promise<T>;
  }

  private async _postBytes(path: string, body: unknown): Promise<Buffer> {
    const resp = await this._request("POST", path, body);
    await this._raiseForStatus(resp);
    return Buffer.from(await resp.arrayBuffer());
  }

  private async _deleteJson<T = Record<string, unknown>>(path: string): Promise<T> {
    const resp = await this._request("DELETE", path);
    await this._raiseForStatus(resp);
    if (resp.status === 204) return {} as T;
    const text = await resp.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
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
  async compile(latex: string, options: CompileOptions = {}): Promise<CompileResult> {
    const { engine = "pdflatex", timeout, runs, files } = options;
    const body: Record<string, unknown> = { latex, engine };
    if (timeout != null) body.timeout = timeout;
    if (runs != null) body.runs = runs;
    if (files?.length) body.files = files;

    const data = await this._postJson<Record<string, unknown>>("/api/v1/compile", body);
    return {
      pdf: Buffer.from(data.pdf as string, "base64"),
      engine: (data.engine as string | undefined) ?? engine,
      durationMs: (data.duration as number | undefined) ?? 0,
      sizeBytes: (data.sizeBytes as number | undefined) ?? 0,
      jobId: (data.jobId as string | undefined) ?? "",
      log: (data.log as string | undefined) ?? "",
    };
  }

  /**
   * Smart compile — auto-detects the required engine from the preamble.
   *
   * Inspects `\usepackage` declarations to pick the best engine automatically
   * (e.g. `fontspec` → xelatex, `luacode` → lualatex).
   */
  async compileSmart(latex: string, options: SmartCompileOptions = {}): Promise<CompileResult> {
    const { timeout, files } = options;
    const body: Record<string, unknown> = { latex, engine: "auto" };
    if (timeout != null) body.timeout = timeout;
    if (files?.length) body.files = files;

    const data = await this._postJson<Record<string, unknown>>("/api/v1/compile/smart", body);
    return {
      pdf: Buffer.from(data.pdf as string, "base64"),
      engine: (data.engine as string | undefined) ?? "auto",
      durationMs: (data.duration as number | undefined) ?? 0,
      sizeBytes: (data.sizeBytes as number | undefined) ?? 0,
      jobId: (data.jobId as string | undefined) ?? "",
      log: (data.log as string | undefined) ?? "",
      analysis: data.analysis as Record<string, unknown> | undefined,
    };
  }

  // ── Async Compilation ───────────────────────────────────────────────────────

  /**
   * Submit a compilation job to the background queue.
   *
   * Returns immediately with a job ID. Use {@link waitForJob} to block until
   * done, or poll {@link getJob} manually.
   */
  async asyncCompile(latex: string, options: CompileOptions = {}): Promise<AsyncJob> {
    const { engine = "pdflatex", timeout, runs, files } = options;
    const body: Record<string, unknown> = { latex, engine };
    if (timeout != null) body.timeout = timeout;
    if (runs != null) body.runs = runs;
    if (files?.length) body.files = files;

    const data = await this._postJson<Record<string, unknown>>("/api/v1/compile/async", body);
    return {
      jobId: data.jobId as string,
      status: (data.status as string | undefined) ?? "pending",
    };
  }

  /** Poll the status of an async compilation job. */
  async getJob(jobId: string): Promise<JobResult> {
    const data = await this._getJson<Record<string, unknown>>(`/api/v1/jobs/${jobId}`);
    const result = ((data.result ?? {}) as Record<string, unknown>);
    return {
      jobId: (data.id as string | undefined) ?? jobId,
      status: (data.status as string | undefined) ?? "unknown",
      log: (result.log as string | undefined) ?? "",
      durationMs: (result.duration as number | undefined) ?? 0,
      error: (result.error as string | undefined) ?? "",
      success: (result.success as boolean | undefined) ?? false,
    };
  }

  /**
   * Download the PDF for a completed async job.
   *
   * The PDF is **deleted from the server immediately after this call**
   * (one-time download). Save the bytes before calling again.
   */
  async getJobPdf(jobId: string): Promise<Buffer> {
    return this._getBytes(`/api/v1/jobs/${jobId}/pdf`);
  }

  /** Fetch the compiler log for a finished async job. */
  async getJobLog(jobId: string): Promise<string> {
    const data = await this._getJson<Record<string, unknown>>(`/api/v1/jobs/${jobId}/log`);
    return (data.log as string | undefined) ?? "";
  }

  /** Delete a job and its associated files from the server. */
  async deleteJob(jobId: string): Promise<void> {
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
  async waitForJob(jobId: string, options: WaitOptions = {}): Promise<CompileResult> {
    const { pollInterval = 2_000, timeout = 300_000 } = options;
    const deadline = Date.now() + timeout;

    for (;;) {
      const job = await this.getJob(jobId);

      if (job.status === "completed") {
        const pdf = await this.getJobPdf(jobId);
        return {
          pdf,
          engine: "",
          durationMs: job.durationMs,
          sizeBytes: pdf.length,
          jobId,
          log: job.log,
        };
      }

      if (job.status === "failed") {
        throw new CompilationError(
          job.error || "compilation failed",
          job.log,
          422,
          { log: job.log, error: job.error },
        );
      }

      if (Date.now() >= deadline) {
        throw new FormaTexError(
          `job ${jobId} did not complete within ${timeout / 1000}s (status: ${job.status})`,
        );
      }

      await new Promise<void>((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  // ── Syntax / Lint ───────────────────────────────────────────────────────────

  /**
   * Validate LaTeX syntax without compiling (free, no quota cost).
   *
   * Uses a fast parser pass — does not invoke TeX.
   */
  async checkSyntax(latex: string): Promise<SyntaxResult> {
    const data = await this._postJson<Record<string, unknown>>("/api/v1/compile/check", { latex });
    return {
      valid: (data.valid as boolean | undefined) ?? false,
      errors: (data.errors as unknown[] | undefined) ?? [],
      warnings: (data.warnings as unknown[] | undefined) ?? [],
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
  async lint(latex: string): Promise<LintResult> {
    const data = await this._postJson<Record<string, unknown>>("/api/v1/lint", { latex });
    const diagnostics: LintDiagnostic[] = (
      (data.diagnostics as unknown[] | undefined) ?? []
    ).map((d) => {
      const diag = d as Record<string, unknown>;
      return {
        line: (diag.line as number | undefined) ?? 0,
        column: (diag.column as number | undefined) ?? 0,
        severity: (diag.severity as LintDiagnostic["severity"] | undefined) ?? "warning",
        message: (diag.message as string | undefined) ?? "",
        source: (diag.source as string | undefined) ?? "chktex",
        code: (diag.code as string | undefined) ?? "",
      };
    });
    const errorCount = diagnostics.filter((d) => d.severity === "error").length;
    const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
    return {
      diagnostics,
      durationMs: (data.duration as number | undefined) ?? 0,
      errorCount,
      warningCount,
      valid: errorCount === 0,
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
  async convert(latex: string, options: ConvertOptions = {}): Promise<ConvertResult> {
    const { files } = options;
    const body: Record<string, unknown> = { latex };
    if (files?.length) body.files = files;
    const docx = await this._postBytes("/api/v1/convert", body);
    return { docx, sizeBytes: docx.length };
  }

  // ── Usage / Engines ─────────────────────────────────────────────────────────

  /** Get current month's compilation usage for this API key. */
  async getUsage(): Promise<UsageStats> {
    const data = await this._getJson<Record<string, unknown>>("/api/v1/usage");
    const comp = ((data.compilations ?? {}) as Record<string, unknown>);
    const period = ((data.period ?? {}) as Record<string, unknown>);
    return {
      plan: (data.plan as string | undefined) ?? "",
      compilationsUsed:
        (comp.used as number | undefined) ??
        (data.compilationsUsed as number | undefined) ??
        0,
      compilationsLimit:
        (comp.limit as number | undefined) ??
        (data.compilationsLimit as number | undefined) ??
        0,
      periodStart:
        (period.start as string | undefined) ??
        (data.periodStart as string | undefined) ??
        "",
      periodEnd:
        (period.end as string | undefined) ??
        (data.periodEnd as string | undefined) ??
        "",
      raw: data,
    };
  }

  /** List available compilation engines and their status. */
  async listEngines(): Promise<Record<string, unknown>[]> {
    const data = await this._getJson<Record<string, unknown>>("/api/v1/engines");
    return (data.engines as Record<string, unknown>[] | undefined) ?? [];
  }
}
