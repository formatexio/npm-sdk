# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.3.0] - 2026-06-18

### Added
- `analyzeBibliography(bib)` — parse BibTeX into structured entries with APA, MLA, and Chicago citations
- New types: `BibEntry`, `BibFormatted`, `BibResult`

---

## [1.2.0] - 2026-06-18

### Added
- `wordCount(latex)` — word, header, caption, float, and math counts via texcount (no quota)
- `extractDependencies(latex)` — list all `\usepackage` declarations; split into available/unavailable
- `checkPackages(names)` — check whether TeX packages are installed in TeX Live
- `extractMetadata(latex)` — extract title, authors, date, abstract, and keywords
- New types: `WordCountResult`, `DependenciesResult`, `PackageStatus`, `DocumentMetadata`

---

## [1.1.0] - 2026-06-17

### Added
- `renderEquation(latex, options)` — render a single math equation as PNG or SVG
- `renderEquations(equations)` — batch render up to 20 equations
- `getCompilationPdf(compilationId)` — retrieve stored PDF from a sync compile by job ID
- `listProjects()` — list all projects accessible via API key
- `getProject(projectId)` — get a single project
- `listProjectFiles(projectId)` — list files in a project
- `readProjectFile(projectId, fileName)` — download a project file as raw bytes
- `upsertProjectFile(projectId, fileName, content, contentType)` — create or replace a project file
- `deleteProjectFile(projectId, fileName)` — delete a project file
- `renameProjectFile(projectId, oldPath, newPath)` — rename/move a project file
- `exportProject(projectId)` — download the full project as a ZIP archive
- New types: `RenderResult`, `RenderBatchResult`, `RenderEquationOptions`, `Project`, `ProjectFile`
- `overage` field added to `UsageStats`

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
