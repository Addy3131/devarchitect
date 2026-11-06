# 🛡️ DevArchitect — Engineering Intelligence & Architectural Guardrails

> **Understand your codebase. Prevent architectural drift. Engineer with confidence.**

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/devarchitect.devarchitect.svg?style=flat-square&color=blue&label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=devarchitect.devarchitect)
[![npm version](https://img.shields.io/npm/v/devarchitect-cli.svg?style=flat-square&color=blue&label=npm%20cli)](https://www.npmjs.com/package/devarchitect-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/Addy3131/devarchitect/blob/main/LICENSE)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Addy3131%2Fdevarchitect-black?style=flat-square&logo=github)](https://github.com/Addy3131/devarchitect)

DevArchitect brings deterministic architectural intelligence, real-time change blast radius analysis, and boundary enforcement directly into **Visual Studio Code** and **Cursor**.

---

## ⚡ Key Features

### 1. 🛡️ Live Architecture Health Score
- Always visible in your status bar: `$(shield) Health: 94/100 (A)`.
- Evaluates 6 deterministic dimensions: **Architecture Compliance**, **Cyclomatic Complexity**, **Module Coupling**, **Code Duplication**, **Maintainability (LOC)**, and **Testing Coverage**.
- Click the status bar item to run an instant deep analysis.

### 2. 📊 In-Editor Architecture Studio
- Explore your interactive architecture graph **directly inside a VS Code editor tab** without launching external browsers or servers.
- Filter by layer (**Components**, **Services**, **Hooks**, **Routes**, **Utilities**).
- Click any node to visualize its **downstream callers (blast radius)**, inspect outgoing dependencies, and jump directly to the source file with 1 click.

### 3. 💥 Real-Time Change Blast Radius
- **Inline CodeLens**: Displays downstream callers above exported components and functions (`💥 Blast Radius: 8 downstream files`).
- **Sidebar Blast Radius Tree**: Lists all downstream files importing your active editor file with one-click navigation.
- Automatically refreshes on tab change and file save.

### 4. 📁 Monorepo & Subfolder Auto-Detection
- Works effortlessly with root workspaces, monorepos (`pnpm`, `Turborepo`, `npm`, `yarn`), and nested project folders (e.g. `apps/*`, `packages/*`, `client/`, `server/`).
- 1-click **Scope Switcher**: Switch target project folders anytime via the view title button or command palette.

### 5. 🚨 Policy Violations & Instant Code Jumps
- Expand the **Policy Violations** tree to view architectural violations (Clean Architecture layers, Feature-Sliced Design, circular dependency traps).
- Click any violation to jump immediately to the exact offending line in your code.

---

## 🚀 Quick Start

1. Install **DevArchitect** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=devarchitect.devarchitect) or Open VSX Registry (Cursor).
2. Open any TypeScript or JavaScript workspace.
3. Click the **DevArchitect Shield** icon in the Activity Bar to view your Code Health and Active File Blast Radius.
4. Click the graph icon (`📊`) in the sidebar header to open the **Interactive Architecture Studio**!

---

## ⌨️ Command Palette

All features are accessible via `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS):

| Command | Action |
|:---|:---|
| `DevArchitect: Open Architecture Graph in Editor` | Opens visual architecture studio webview in an editor tab |
| `DevArchitect: Refresh Architecture Health` | Runs codebase health evaluation and updates scores |
| `DevArchitect: Refresh Active File Blast Radius` | Updates blast radius callers for active file |
| `DevArchitect: Select Target Project Folder` | Switch target folder in monorepos and nested workspaces |
| `DevArchitect: Inspect File Blast Radius` | Shows quick notifications of downstream callers |
| `DevArchitect: Validate Architecture Rules` | Runs rule evaluation in terminal |
| `DevArchitect: Audit Environment Variables & Secrets` | Scans for missing env keys and secret leaks |
| `DevArchitect: Run Safe Fixer (Dry Run)` | Safe auto-fixer for unused types and logs |

---

## 🖥️ Companion CLI

Need CI/CD enforcement, Git pre-commit & pre-push guardrails, or headless terminal analysis?

DevArchitect comes with a fast CLI companion package published to npm:

```bash
# Run instantly with npx (zero installation)
npx devarchitect-cli health
npx devarchitect-cli studio
npx devarchitect-cli validate

# Or install globally
npm install -g devarchitect-cli
```

Explore the CLI documentation on [npm](https://www.npmjs.com/package/devarchitect-cli) and [GitHub](https://github.com/Addy3131/devarchitect).

---

## ⚙️ Configuration

DevArchitect works out of the box with zero configuration. To customize architecture presets, layers, and rules, create `.devarchitect/config.json`:

```json
{
  "$schema": "https://devarchitect.dev/schema/config.json",
  "architecture": {
    "preset": "recommended",
    "rules": {
      "no-circular-dependencies": "error",
      "no-cross-feature-imports": "error",
      "enforce-public-api": "warning",
      "max-dependency-depth": "warning"
    }
  }
}
```

---

## 📄 License & Community

- **License**: [MIT](https://github.com/Addy3131/devarchitect/blob/main/LICENSE)
- **Source Code**: [github.com/Addy3131/devarchitect](https://github.com/Addy3131/devarchitect)
- **Issues & Feedback**: [GitHub Issues](https://github.com/Addy3131/devarchitect/issues)
