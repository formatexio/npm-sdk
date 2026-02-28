# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.1] - 2026-02-28

### Fixed
- Corrected `package.json` exports: `import` entry pointed to non-existent `index.mjs` (should be `index.js`)
- Added `Accept: application/json` header to all JSON requests — backend uses content negotiation to decide between PDF bytes and JSON envelope
- Removed internal `staging` and `baseUrl` constructor options from the public API

---

## [1.0.0] - 2026-02-27

### Added
- Initial release
- `FormaTexClient` with full API coverage: `compile`, `compileSmart`, `asyncCompile`, `waitForJob`, `getJob`, `getJobPdf`, `getJobLog`, `deleteJob`, `checkSyntax`, `lint`, `convert`, `getUsage`, `listEngines`
- `fileEntry()` helper for attaching companion files (images, `.bib`, `.cls`)
- Typed errors: `FormaTexError`, `AuthenticationError`, `CompilationError`, `RateLimitError`, `PlanLimitError`
- Full TypeScript types with JSDoc
- ESM + CJS dual build via tsup
- Node.js ≥ 18, zero runtime dependencies
