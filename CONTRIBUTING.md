# Contributing to DuckDB Powerhouse

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [VS Code](https://code.visualstudio.com/) 1.85.0+
- [Node.js](https://nodejs.org/) 18+

## Development Setup

```bash
# Clone the repo
git clone https://github.com/PlugMonkey/duckdb-powerhouse.git
cd duckdb-powerhouse

# Install dependencies
bun install

# Start watch mode (auto-rebuilds on changes)
bun run watch
```

## Running & Debugging

1. Open the project in VS Code
2. Press **F5** to launch the Extension Development Host
3. Set breakpoints in TypeScript source files

## Running Tests

```bash
bun test              # Unit tests
bun run typecheck     # Type checking
bun run lint          # Linting
```

Run all checks before submitting:

```bash
bun run lint && bun run typecheck && bun test
```

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(explorer): add table preview on right-click
fix(results): handle null values in grid display
refactor(connection): extract status bar module
test(export): add CSV export tests
docs: update development setup
```

## Pull Request Process

1. Create a feature branch from `main` (`feature/your-feature`, `fix/your-fix`)
2. Make changes with atomic, well-described commits
3. Ensure all checks pass (`bun run lint && bun run typecheck && bun test`)
4. Open a PR with a clear description of the changes
5. PRs are squash-merged to `main`

## Reporting Bugs

Open an [issue](https://github.com/PlugMonkey/duckdb-powerhouse/issues) with:

- VS Code version and OS
- Steps to reproduce
- Expected vs actual behavior
- Error messages from the Output panel ("DuckDB Powerhouse" channel)

## Code Style

- TypeScript strict mode
- Explicit types for public APIs, inference for locals
- `async/await` over raw promises
- See the codebase for patterns and conventions

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
