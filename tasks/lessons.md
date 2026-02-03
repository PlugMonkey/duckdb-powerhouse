# Lessons Learned

This file captures patterns and corrections to prevent repeating mistakes.

---

## 2024-01-XX: Verify Packaging Before Claiming Complete

**Mistake**: Marked MVP as complete without actually running `bun run package` to verify the extension could be packaged.

**Root Cause**: Assumed that passing typecheck, lint, tests, and build was sufficient verification.

**Rule**: For VS Code extensions, ALWAYS verify:
1. `bun run typecheck` - Types are correct
2. `bun run lint` - Code style passes
3. `bun run test` - All tests pass
4. `bun run build` - Extension bundles correctly
5. `bun run package` - Extension packages into .vsix without errors
6. Check the .vsix file size is reasonable (not including all of node_modules)

**Fix Applied**:
- Installed `@vscode/vsce` as dev dependency
- Created `.vscodeignore` to exclude unnecessary files
- Created `LICENSE` file (required by vsce)
- Created `README.md` (required by vsce)
- Included `duckdb-async` native module in package

---

## 2024-01-XX: Features Need Tests, Not Just Implementation

**Mistake**: Claimed export functionality was "complete" in Phase 5/7 without any tests. The export code was embedded as private methods in the panel class, making it untestable.

**Root Cause**: Prioritized shipping over quality. Assumed that if code works manually, it's done.

**Rule**:
1. Every feature needs tests - no exceptions
2. Extract logic into pure, testable functions (not private class methods)
3. If you can't test it, you can't claim it's done
4. "Working code" without tests is technical debt

**Fix Applied**:
- Created `src/export/formatters.ts` with pure functions
- Wrote 22 tests covering CSV, JSON, and TSV formatting
- Refactored panel.ts to use the extracted formatters
- Tests verify edge cases: escaping, nulls, newlines, etc.

---

## 2024-01-XX: DuckDB Has Multiple Catalogs

**Mistake**: Schema query returned duplicate "main" entries because DuckDB has multiple catalogs (memory, system, temp) each with their own "main" schema.

**Root Cause**: Assumed information_schema.schemata would return unique schema names.

**Rule**: When querying DuckDB metadata:
1. Use `DISTINCT` when querying schema names across catalogs
2. Or filter by `catalog_name = 'memory'` for user data only
3. Test with real DuckDB, not just mocks

**Fix Applied**: Added `DISTINCT` to the schema query in schema-loader.ts.

---

## Template for New Lessons

```markdown
## YYYY-MM-DD: Short Description

**Mistake**: What went wrong?

**Root Cause**: Why did it happen?

**Rule**: What rule prevents this in the future?

**Fix Applied**: What was done to fix it?
```
