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
  /** Compilations used beyond the plan limit (pay-as-you-go). */
  overage: number;
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

// ── Rendering ────────────────────────────────────────────────────────────────

/** Result of a single equation render. */
export interface RenderResult {
  /** Raw PNG or SVG bytes. */
  data: Buffer;
  /** `"png"` or `"svg"`. */
  format: string;
  /** Image width in pixels (0 if unknown). */
  width: number;
  /** Image height in pixels (0 if unknown). */
  height: number;
}

/** One item in a batch render response. Either `data` or `error` is set. */
export interface RenderBatchResult {
  data?: Buffer;
  format: string;
  width?: number;
  height?: number;
  error?: string;
}

/** Options for {@link FormaTexClient.renderEquation}. */
export interface RenderEquationOptions {
  /** `"png"` (default) or `"svg"`. */
  format?: string;
  /** PNG resolution 72–600. Ignored for SVG. */
  dpi?: number;
  /** `true` for display (centred) math, `false` for inline. */
  display?: boolean;
  /** `true` for transparent background. */
  transparent?: boolean;
  /** Border around the equation in pt (0–20). */
  padding?: number;
  /**
   * Extra packages to load (max 5).
   * Allowed: `mhchem`, `siunitx`, `xcolor`, `physics`, `bm`,
   * `mathtools`, `esint`, `cancel`, `chemfig`, `tikz`.
   */
  packages?: string[];
}

// ── Projects ─────────────────────────────────────────────────────────────────

/** A FormaTeX project. */
export interface Project {
  id: string;
  name: string;
  mainFile: string;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Metadata for a single file inside a project. */
export interface ProjectFile {
  path: string;
  size: number;
  mimeType: string;
  updatedAt: string;
}

// ── Document Intelligence ─────────────────────────────────────────────────────

/** Result of a word count operation (via texcount, no compilation). */
export interface WordCountResult {
  textWords: number;
  headerWords: number;
  captionWords: number;
  headers: number;
  floats: number;
  mathInline: number;
  mathDisplay: number;
  totalWords: number;
  durationMs: number;
}

/** Package dependency analysis for a LaTeX document. */
export interface DependenciesResult {
  /** All packages declared in the document. */
  packages: string[];
  /** Packages found in TeX Live. */
  available: string[];
  /** Packages not found in TeX Live. */
  unavailable: string[];
  durationMs: number;
}

/** Availability of a single TeX package. */
export interface PackageStatus {
  name: string;
  available: boolean;
}

/** Extracted metadata from a LaTeX document. */
export interface DocumentMetadata {
  title: string;
  authors: string[];
  date: string;
  abstract: string;
  keywords: string[];
}

/** Pre-formatted citation strings for a single BibTeX entry. */
export interface BibFormatted {
  apa: string;
  mla: string;
  chicago: string;
}

/** A single parsed BibTeX entry with structured fields and formatted citations. */
export interface BibEntry {
  key: string;
  /** Entry type in lowercase: `article`, `book`, `inproceedings`, etc. */
  type: string;
  /** All field key-value pairs exactly as parsed. */
  fields: Record<string, string>;
  /** Author (or editor) names split into individual strings. */
  authors: string[];
  /** Best-effort formatted citations in APA, MLA, and Chicago styles. */
  formatted: BibFormatted;
}

/** Result of a bibliography parse operation. */
export interface BibResult {
  entries: BibEntry[];
  count: number;
  durationMs: number;
}

// ── Rendering (TikZ / Thumbnail) ──────────────────────────────────────────────

/** Options for {@link FormaTexClient.renderTikz}. */
export interface RenderTikzOptions {
  /** TikZ libraries to load (e.g. `["arrows.meta", "positioning"]`). Max 20. */
  libraries?: string[];
  /**
   * Extra LaTeX packages to include (must be in the allowed list). Max 10.
   * Allowed: `mhchem`, `siunitx`, `xcolor`, `physics`, `bm`,
   * `mathtools`, `esint`, `cancel`, `chemfig`.
   */
  packages?: string[];
  /** `"png"` (default) or `"svg"`. */
  format?: string;
  /** PNG resolution 72–600 (default 150). Ignored for SVG. */
  dpi?: number;
  /** `true` for transparent background. */
  transparent?: boolean;
}

/** Options for {@link FormaTexClient.thumbnail} and {@link FormaTexClient.compileToImage}. */
export interface ThumbnailOptions {
  /** LaTeX engine: `"pdflatex"` (default), `"xelatex"`, or `"lualatex"`. */
  engine?: string;
  /** 1-indexed page number to rasterize (default: 1). */
  page?: number;
  /** PNG resolution 72–300 (default 150). */
  dpi?: number;
}

/** Result of a thumbnail or compile-to-image operation. */
export interface ThumbnailResult {
  /** Raw PNG bytes. */
  data: Buffer;
  /** Image width in pixels (0 if unknown). */
  width: number;
  /** Image height in pixels (0 if unknown). */
  height: number;
}

// ── Batch Generation ──────────────────────────────────────────────────────────

/** Options for {@link FormaTexClient.generateBatch}. */
export interface BatchOptions {
  /** LaTeX engine: `"pdflatex"` (default), `"xelatex"`, or `"lualatex"`. */
  engine?: string;
  /**
   * Filename template for each PDF. Supports `{{field}}`, `{{@index}}` (0-based),
   * `{{@number}}` (1-based). `.pdf` is appended automatically.
   * Default: `"document-{{@number}}"`.
   */
  filename?: string;
}

/** Options for {@link FormaTexClient.compileMerge}. */
export interface MergeOptions {
  /** LaTeX engine: `"pdflatex"` (default), `"xelatex"`, or `"lualatex"`. */
  engine?: string;
  /** Filename template. Default: `"document-{{@number}}"`. */
  filename?: string;
}

/** One entry in a batch manifest's `results` array. */
export interface BatchResultItem {
  /** 0-based row index. */
  index: number;
  filename: string;
  success: boolean;
  /** Error message, only present when `success` is `false`. */
  error?: string;
}

/** Result of a batch or merge operation. */
export interface BatchResult {
  /** Raw ZIP bytes containing all compiled PDFs and `manifest.json`. */
  zip: Buffer;
  manifest: {
    total: number;
    success: number;
    failed: number;
    results: BatchResultItem[];
  };
}
