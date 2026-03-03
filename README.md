# FormatEx Node.js / TypeScript SDK

[![npm version](https://img.shields.io/npm/v/formatex-sdk)](https://www.npmjs.com/package/formatex-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Official Node.js / TypeScript SDK for the [FormatEx](https://formatex.io) LaTeX-to-PDF API.

## Requirements

- Node.js ≥ 18 (uses native `fetch`)

## Installation

```bash
npm install formatex-sdk
# or
pnpm add formatex-sdk
# or
yarn add formatex-sdk
```

## Quick Start

```ts
import { FormaTexClient } from "formatex";
import { writeFileSync } from "fs";

const client = new FormaTexClient("fx_your_api_key");

const result = await client.compile(`
  \\documentclass{article}
  \\begin{document}
  Hello, \\LaTeX!
  \\end{document}
`);

writeFileSync("output.pdf", result.pdf);
console.log(`PDF ready: ${result.sizeBytes} bytes in ${result.durationMs}ms`);
```

Get an API key from the [FormatEx dashboard](https://app.formatex.io).

---

## API Reference

### `new FormaTexClient(apiKey, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `120_000` | Request timeout in milliseconds |

---

### Compilation

#### `client.compile(latex, options?)` → `CompileResult`

Compile LaTeX synchronously.

```ts
const result = await client.compile(latex, {
  engine: "xelatex",   // pdflatex | xelatex | lualatex | latexmk
  timeout: 30,         // seconds (plan-limited)
  runs: 2,             // compiler passes (1–5)
  files: [             // companion files
    fileEntry("logo.png", readFileSync("logo.png")),
  ],
});
// result.pdf        → Buffer
// result.engine     → string
// result.durationMs → number
// result.sizeBytes  → number
// result.jobId      → string
// result.log        → string
```

#### `client.compileSmart(latex, options?)` → `CompileResult`

Auto-detects the best engine from `\usepackage` declarations and fixes common LLM-generated errors.

```ts
const result = await client.compileSmart(latex);
// result.analysis → { engine, reason, ... }
```

---

### Async Compilation

For large documents or background processing:

```ts
// 1. Submit
const job = await client.asyncCompile(latex, { engine: "lualatex" });
// job.jobId, job.status

// 2. Wait (polls automatically)
const result = await client.waitForJob(job.jobId, {
  pollInterval: 2_000,  // ms
  timeout: 300_000,     // ms
});
writeFileSync("out.pdf", result.pdf);

// Or poll manually
const status = await client.getJob(job.jobId);
if (status.status === "completed") {
  const pdf = await client.getJobPdf(job.jobId);
}

// Other job methods
const log = await client.getJobLog(job.jobId);
await client.deleteJob(job.jobId);
```

---

### Syntax Check & Lint

```ts
// Free — does not count against your quota
const syntax = await client.checkSyntax(latex);
// syntax.valid, syntax.errors, syntax.warnings

// ChkTeX static analysis
const lint = await client.lint(latex);
// lint.valid, lint.errorCount, lint.warningCount
for (const d of lint.diagnostics) {
  console.log(`Line ${d.line}: [${d.severity}] ${d.message}`);
}
```

---

### Convert to DOCX

```ts
const result = await client.convert(latex);
writeFileSync("document.docx", result.docx);
```

---

### Usage & Engines

```ts
const usage = await client.getUsage();
console.log(`${usage.compilationsUsed}/${usage.compilationsLimit} on ${usage.plan} plan`);

const engines = await client.listEngines();
console.log(engines.map((e) => e.name));
```

---

### Multi-file Compilation

Use `fileEntry()` to attach images, `.bib` files, or other resources:

```ts
import { FormaTexClient, fileEntry } from "formatex";
import { readFileSync } from "fs";

const result = await client.compile(latex, {
  files: [
    fileEntry("figure.png", readFileSync("figure.png")),
    fileEntry("refs.bib", readFileSync("refs.bib")),
    // Or pass a base64 string directly:
    fileEntry("data.csv", "Y29sdW1uMSxjb2x1bW4yCg=="),
  ],
});
```

---

### Error Handling

```ts
import {
  FormaTexClient,
  CompilationError,
  AuthenticationError,
  RateLimitError,
  PlanLimitError,
} from "formatex";

try {
  const result = await client.compile(latex);
} catch (err) {
  if (err instanceof CompilationError) {
    console.error("LaTeX error:", err.message);
    console.error("Compiler log:\n", err.log);
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited — retry in ${err.retryAfter}s`);
  } else if (err instanceof PlanLimitError) {
    console.error("Plan limit exceeded — upgrade at https://app.formatex.io/billing");
  } else if (err instanceof AuthenticationError) {
    console.error("Invalid API key");
  }
}
```

---

## Links

- [FormatEx Website](https://formatex.io)
- [API Documentation](https://formatex.io/docs/api)
- [Dashboard](https://app.formatex.io)
- [Status](https://formatex.io/status)

## License

MIT
