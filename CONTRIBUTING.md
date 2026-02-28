# Contributing to the FormaTex Node.js SDK

Thanks for your interest in contributing!

## Before You Start

- For **bug reports** and **feature requests**, open a GitHub Issue first.
- For **security vulnerabilities**, see [SECURITY.md](SECURITY.md) — do **not** open a public issue.

## Development Setup

```bash
git clone https://github.com/forma-tex/npm-sdk.git
cd npm-sdk
npm install
```

Build:

```bash
npm run build
```

Type-check:

```bash
npm run typecheck   # or: npx tsc --noEmit
```

## Making Changes

1. Fork the repo and create a branch from `main`: `git checkout -b fix/my-fix`
2. Make your changes in `src/`
3. Ensure `npm run build` passes with no errors
4. Update `README.md` if you changed the public API
5. Open a pull request

## Pull Request Guidelines

- Keep PRs focused — one fix or feature per PR
- Write a clear PR description explaining **what** and **why**
- Do not bump the version in `package.json` — maintainers handle releases

## Code Style

- TypeScript strict mode is enforced
- No runtime dependencies — the SDK uses native `fetch` only
- Error messages must be human-readable

## Releasing (maintainers only)

1. Update `version` in `package.json`
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "chore: release vX.Y.Z"`
4. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
5. GitHub Actions publishes to npm automatically

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
