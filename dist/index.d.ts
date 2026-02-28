/** Result of a synchronous compilation request. */
interface CompileResult {
    /** Raw PDF bytes. */
    pdf: Buffer;
    /** Engine that was used. */
    engine: string;
    /** Compile time in milliseconds. */
    durationMs: number;
    /** PDF size in bytes. */
    sizeBytes: number;
    /** Server-assigned job ID. */
    jobId: string;
    /** Compiler log output. */
    log: string;
    /** Present only for smart compile — describes auto-detected engine. */
    analysis?: Record<string, unknown>;
}
/** Reference to an async compilation job returned immediately on submit. */
interface AsyncJob {
    jobId: string;
    /** Initial status is always `"pending"`. */
    status: string;
}
/** Full status of a polled async job. */
interface JobResult {
    jobId: string;
    /** `pending` | `processing` | `completed` | `failed` */
    status: string;
    log: string;
    durationMs: number;
    error: string;
    success: boolean;
}
/** A single ChkTeX lint issue. */
interface LintDiagnostic {
    line: number;
    column: number;
    severity: "error" | "warning" | "info";
    message: string;
    source: string;
    code: string;
}
/** Result of a lint operation. */
interface LintResult {
    diagnostics: LintDiagnostic[];
    durationMs: number;
    errorCount: number;
    warningCount: number;
    /** `true` when `errorCount === 0`. */
    valid: boolean;
}
/** Result of a fast syntax check (no quota cost). */
interface SyntaxResult {
    valid: boolean;
    errors: unknown[];
    warnings: unknown[];
}
/** Result of a LaTeX → DOCX conversion. */
interface ConvertResult {
    /** Raw DOCX bytes. */
    docx: Buffer;
    sizeBytes: number;
}
/** Monthly usage statistics. */
interface UsageStats {
    plan: string;
    compilationsUsed: number;
    compilationsLimit: number;
    periodStart: string;
    periodEnd: string;
    /** Full raw API response. */
    raw: Record<string, unknown>;
}
/**
 * A companion file entry for multi-file compilation.
 * Use {@link fileEntry} to build these from a `Buffer` or base64 string.
 */
interface FileEntry {
    /** Filename as referenced in the LaTeX source (e.g. `"fig.png"`). */
    name: string;
    /** Base64-encoded file content. */
    content: string;
}
/** Options for {@link FormaTexClient.compile} and {@link FormaTexClient.asyncCompile}. */
interface CompileOptions {
    /** `pdflatex` (default), `xelatex`, `lualatex`, or `latexmk`. */
    engine?: string;
    /** Max compile time in seconds (plan-limited). */
    timeout?: number;
    /** Number of compiler passes (1–5). */
    runs?: number;
    /** Companion files — use {@link fileEntry} to build entries. */
    files?: FileEntry[];
}
/** Options for {@link FormaTexClient.compileSmart}. */
interface SmartCompileOptions {
    timeout?: number;
    files?: FileEntry[];
}
/** Options for {@link FormaTexClient.convert}. */
interface ConvertOptions {
    files?: FileEntry[];
}
/** Options for {@link FormaTexClient.waitForJob}. */
interface WaitOptions {
    /** Milliseconds between status polls (default: 2000). */
    pollInterval?: number;
    /** Max total wait time in milliseconds (default: 300_000). */
    timeout?: number;
}
/** Constructor options for {@link FormaTexClient}. */
interface FormaTexClientOptions {
    /**
     * Override the API base URL. Takes precedence over `staging`.
     * Defaults to `process.env.FORMATEX_BASE_URL` or `https://api.formatex.io`.
     */
    baseUrl?: string;
    /** Point to the staging server (`https://api-test.formatex.zedmed.online`). */
    staging?: boolean;
    /** Request timeout in milliseconds (default: 120_000). */
    timeout?: number;
}

declare const DEFAULT_BASE_URL: string;
declare const STAGING_BASE_URL = "https://api-test.formatex.zedmed.online";
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
declare function fileEntry(name: string, content: Buffer | string): FileEntry;
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
declare class FormaTexClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeoutMs;
    constructor(apiKey: string, options?: FormaTexClientOptions);
    private _request;
    private _raiseForStatus;
    private _getJson;
    private _getBytes;
    private _postJson;
    private _postBytes;
    private _deleteJson;
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
    compile(latex: string, options?: CompileOptions): Promise<CompileResult>;
    /**
     * Smart compile — auto-detects the required engine from the preamble.
     *
     * Inspects `\usepackage` declarations to pick the best engine automatically
     * (e.g. `fontspec` → xelatex, `luacode` → lualatex).
     */
    compileSmart(latex: string, options?: SmartCompileOptions): Promise<CompileResult>;
    /**
     * Submit a compilation job to the background queue.
     *
     * Returns immediately with a job ID. Use {@link waitForJob} to block until
     * done, or poll {@link getJob} manually.
     */
    asyncCompile(latex: string, options?: CompileOptions): Promise<AsyncJob>;
    /** Poll the status of an async compilation job. */
    getJob(jobId: string): Promise<JobResult>;
    /**
     * Download the PDF for a completed async job.
     *
     * The PDF is **deleted from the server immediately after this call**
     * (one-time download). Save the bytes before calling again.
     */
    getJobPdf(jobId: string): Promise<Buffer>;
    /** Fetch the compiler log for a finished async job. */
    getJobLog(jobId: string): Promise<string>;
    /** Delete a job and its associated files from the server. */
    deleteJob(jobId: string): Promise<void>;
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
    waitForJob(jobId: string, options?: WaitOptions): Promise<CompileResult>;
    /**
     * Validate LaTeX syntax without compiling (free, no quota cost).
     *
     * Uses a fast parser pass — does not invoke TeX.
     */
    checkSyntax(latex: string): Promise<SyntaxResult>;
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
    lint(latex: string): Promise<LintResult>;
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
    convert(latex: string, options?: ConvertOptions): Promise<ConvertResult>;
    /** Get current month's compilation usage for this API key. */
    getUsage(): Promise<UsageStats>;
    /** List available compilation engines and their status. */
    listEngines(): Promise<Record<string, unknown>[]>;
}

/** Base exception for all FormaTex errors. */
declare class FormaTexError extends Error {
    readonly statusCode: number | undefined;
    readonly body: Record<string, unknown>;
    constructor(message: string, statusCode?: number, body?: Record<string, unknown>);
}
/** Invalid or missing API key (HTTP 401). */
declare class AuthenticationError extends FormaTexError {
    constructor(message: string, statusCode?: number, body?: Record<string, unknown>);
}
/** LaTeX compilation failed (HTTP 422). Check `.log` for the compiler output. */
declare class CompilationError extends FormaTexError {
    readonly log: string;
    constructor(message: string, log?: string, statusCode?: number, body?: Record<string, unknown>);
}
/** Too many requests (HTTP 429). Check `.retryAfter` for seconds to wait. */
declare class RateLimitError extends FormaTexError {
    readonly retryAfter: number;
    constructor(message: string, retryAfter?: number, statusCode?: number, body?: Record<string, unknown>);
}
/** Plan limit exceeded (HTTP 403). Upgrade your plan to continue. */
declare class PlanLimitError extends FormaTexError {
    constructor(message: string, statusCode?: number, body?: Record<string, unknown>);
}

export { type AsyncJob, AuthenticationError, CompilationError, type CompileOptions, type CompileResult, type ConvertOptions, type ConvertResult, DEFAULT_BASE_URL, type FileEntry, FormaTexClient, type FormaTexClientOptions, FormaTexError, type JobResult, type LintDiagnostic, type LintResult, PlanLimitError, RateLimitError, STAGING_BASE_URL, type SmartCompileOptions, type SyntaxResult, type UsageStats, type WaitOptions, fileEntry };
