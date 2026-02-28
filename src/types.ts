/** Result of a synchronous compilation request. */
export interface CompileResult {
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
export interface AsyncJob {
  jobId: string;
  /** Initial status is always `"pending"`. */
  status: string;
}

/** Full status of a polled async job. */
export interface JobResult {
  jobId: string;
  /** `pending` | `processing` | `completed` | `failed` */
  status: string;
  log: string;
  durationMs: number;
  error: string;
  success: boolean;
}

/** A single ChkTeX lint issue. */
export interface LintDiagnostic {
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
  source: string;
  code: string;
}

/** Result of a lint operation. */
export interface LintResult {
  diagnostics: LintDiagnostic[];
  durationMs: number;
  errorCount: number;
  warningCount: number;
  /** `true` when `errorCount === 0`. */
  valid: boolean;
}

/** Result of a fast syntax check (no quota cost). */
export interface SyntaxResult {
  valid: boolean;
  errors: unknown[];
  warnings: unknown[];
}

/** Result of a LaTeX → DOCX conversion. */
export interface ConvertResult {
  /** Raw DOCX bytes. */
  docx: Buffer;
  sizeBytes: number;
}

/** Monthly usage statistics. */
export interface UsageStats {
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
export interface FileEntry {
  /** Filename as referenced in the LaTeX source (e.g. `"fig.png"`). */
  name: string;
  /** Base64-encoded file content. */
  content: string;
}

/** Options for {@link FormaTexClient.compile} and {@link FormaTexClient.asyncCompile}. */
export interface CompileOptions {
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
export interface SmartCompileOptions {
  timeout?: number;
  files?: FileEntry[];
}

/** Options for {@link FormaTexClient.convert}. */
export interface ConvertOptions {
  files?: FileEntry[];
}

/** Options for {@link FormaTexClient.waitForJob}. */
export interface WaitOptions {
  /** Milliseconds between status polls (default: 2000). */
  pollInterval?: number;
  /** Max total wait time in milliseconds (default: 300_000). */
  timeout?: number;
}

/** Constructor options for {@link FormaTexClient}. */
export interface FormaTexClientOptions {
  /** Request timeout in milliseconds (default: 120_000). */
  timeout?: number;
}
