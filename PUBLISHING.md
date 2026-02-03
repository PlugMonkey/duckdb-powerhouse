# Publishing DuckDB Powerhouse by PlugMonkey to VS Code Marketplace

This guide covers all the steps needed to publish this extension to the [Visual Studio Marketplace](https://marketplace.visualstudio.com/).

**Product Page:** https://plugmonkey.xyz/product/duckdb-powerhouse/
**Publisher Website:** https://plugmonkey.xyz/

## Pre-Publishing Checklist

### Required Items

- [ ] **Icon** (CRITICAL - currently missing)
  - Format: PNG only (SVG not allowed)
  - Size: Minimum 128x128 pixels (256x256 recommended for Retina)
  - Location: `resources/icon.png`

- [x] **CHANGELOG.md** ✓
  - Documents version history
  - Displayed on marketplace page

- [x] **Publisher ID** ✓
  - Set to `PlugMonkey` in package.json

- [x] **Unique Display Name** ✓
  - "DuckDB Powerhouse"

- [x] **LICENSE file** ✓
  - MIT license

- [x] **Gallery Banner** ✓
  - Color: `#FDB813` (DuckDB yellow)
  - Theme: `light`

### Optional But Recommended

- [ ] **Screenshots** in README
  - Show the extension in action
  - Must use HTTPS URLs or relative paths

- [ ] **Badges** in README
  - Version, downloads, rating, etc.

- [ ] **Repository URL**
  - Currently set to `PlugMonkey/duckdb-powerhouse`
  - Update if hosting elsewhere

---

## Step 1: Create an Icon

Create a PNG icon at least 128x128 pixels. Recommended 256x256 for Retina displays.

Save it to: `resources/icon.png`

Then update `package.json`:

```json
{
  "icon": "resources/icon.png"
}
```

**Tips:**
- Use a simple, recognizable design
- Works well at small sizes (16x16 shown in some places)
- Consider using DuckDB's duck mascot or a database icon
- Tools: Figma, Canva, GIMP, or any image editor

---

## Step 2: Create CHANGELOG.md

Create a file at the project root:

```markdown
# Changelog

All notable changes to the DuckDB Powerhouse extension.

## [0.1.0] - 2024-XX-XX

### Added
- Initial release
- In-memory and file-based DuckDB connections
- Data Explorer sidebar with schema browser
- SQL query execution with Ctrl+Enter
- Results panel with sorting, pagination, and export
- Direct querying of Parquet, CSV, and JSON files
- Autocomplete for SQL keywords, tables, and columns
- Query cancellation and timeout settings
- Connection history with recent connections
- Table DDL commands (drop, truncate)
- Import files to tables

### Commands
- Create/disconnect/reconnect connections
- Run, cancel, and explain queries
- Preview and describe data files
- Export results to CSV, JSON, TSV
```

Then update `.vscodeignore` to include it:

```diff
 *.md
 !README.md
+!CHANGELOG.md
```

---

## Step 3: Configure Gallery Banner (Optional)

Add to `package.json` for a styled marketplace header:

```json
{
  "galleryBanner": {
    "color": "#FDB813",
    "theme": "light"
  }
}
```

**Color suggestions:**
- DuckDB yellow: `#FDB813`
- Database blue: `#336791`
- Neutral dark: `#1E1E1E`

**Theme:**
- `"dark"` - Use with light background colors
- `"light"` - Use with dark background colors

---

## Step 4: Update Categories

The current categories are fine, but consider more specific ones:

```json
{
  "categories": [
    "Data Science",
    "Other"
  ]
}
```

**Valid categories:**
- Programming Languages
- Snippets
- Linters
- Themes
- Debuggers
- Formatters
- Keymaps
- SCM Providers
- Other
- Extension Packs
- Language Packs
- **Data Science** ✓
- Machine Learning
- Visualization
- Notebooks
- Education
- Testing

---

## Step 5: Update Repository URL

Change the placeholder URL in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/duckdb-powerhouse"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/duckdb-powerhouse/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/duckdb-powerhouse#readme"
}
```

---

## Step 6: Enhance README with Screenshots (Optional)

Add screenshots to make the marketplace page attractive:

```markdown
## Screenshots

### Data Explorer
![Data Explorer](https://raw.githubusercontent.com/YOUR_USERNAME/duckdb-powerhouse/main/docs/screenshots/explorer.png)

### Query Results
![Results Panel](https://raw.githubusercontent.com/YOUR_USERNAME/duckdb-powerhouse/main/docs/screenshots/results.png)
```

**Requirements:**
- All images must be HTTPS URLs
- Or use relative paths (vsce resolves GitHub URLs)
- No SVG images in documentation

---

## Step 7: Add Badges (Optional)

Add marketplace badges to README:

```markdown
[![Version](https://img.shields.io/visual-studio-marketplace/v/PlugMonkey.duckdb-powerhouse)](https://marketplace.visualstudio.com/items?itemName=PlugMonkey.duckdb-powerhouse)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/PlugMonkey.duckdb-powerhouse)](https://marketplace.visualstudio.com/items?itemName=PlugMonkey.duckdb-powerhouse)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/PlugMonkey.duckdb-powerhouse)](https://marketplace.visualstudio.com/items?itemName=PlugMonkey.duckdb-powerhouse)
```

---

## Step 8: Final package.json Updates

Here's what to add/update in `package.json`:

```json
{
  "icon": "resources/icon.png",
  "galleryBanner": {
    "color": "#FDB813",
    "theme": "light"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/duckdb-powerhouse"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/duckdb-powerhouse/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/duckdb-powerhouse#readme"
}
```

---

## Step 9: Build and Package

```bash
# Run checks
bun run typecheck
bun run lint
bun run test

# Build and package
bun run package
```

This creates `duckdb-powerhouse-0.1.0.vsix`

---

## Step 10: Publish

### Option A: Upload via Web (Recommended for First Time)

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Select your publisher (PlugMonkey)
4. Click "New Extension" → "Visual Studio Code"
5. Upload the `.vsix` file
6. Fill in any additional details
7. Click "Publish"

### Option B: Publish via CLI

```bash
# Login (first time only)
bunx vsce login PlugMonkey

# Publish
bunx vsce publish
```

You'll need a Personal Access Token (PAT) from Azure DevOps:
1. Go to https://dev.azure.com
2. User Settings → Personal Access Tokens
3. Create token with "Marketplace (Publish)" scope

---

## Marketplace Page Content

The marketplace page displays:

| Source | Display Location |
|--------|------------------|
| `displayName` | Extension title |
| `description` | Subtitle/tagline |
| `icon` | Extension icon |
| `galleryBanner` | Header background |
| `README.md` | Main page content |
| `CHANGELOG.md` | Changelog tab |
| `repository` | Resources section |
| `bugs` | Resources section |
| `license` | Resources section |
| `categories` | Filtering/discovery |
| `keywords` | Search/tags |

---

## Quick Fixes Summary

### Must Fix Before Publishing:

1. **Create icon** → `resources/icon.png` (128x128+ PNG)

### Already Done:

- ✓ CHANGELOG.md created
- ✓ .vscodeignore includes CHANGELOG.md
- ✓ galleryBanner configured in package.json
- ✓ Publisher ID set to PlugMonkey
- ✓ LICENSE file exists

### Nice to Have:

2. Add screenshots to README
3. Add marketplace badges

---

## Verification After Publishing

1. Visit: `https://marketplace.visualstudio.com/items?itemName=PlugMonkey.duckdb-powerhouse`
2. Verify icon displays correctly
3. Verify README renders properly
4. Check CHANGELOG tab
5. Test installation: `code --install-extension PlugMonkey.duckdb-powerhouse`

---

## Resources

- [Official Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest Reference](https://code.visualstudio.com/api/references/extension-manifest)
- [Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)
- [Azure DevOps PAT](https://dev.azure.com)
