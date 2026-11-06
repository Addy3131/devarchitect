# 🛡️ devarchitect-cli

> **Understand your codebase. Improve its architecture. Engineer with confidence.**

[![npm version](https://img.shields.io/npm/v/devarchitect-cli.svg?style=flat-square&color=blue&label=npm)](https://www.npmjs.com/package/devarchitect-cli)
[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/devarchitect.devarchitect.svg?style=flat-square&color=blue&label=VS%20Code%20Extension)](https://marketplace.visualstudio.com/items?itemName=devarchitect.devarchitect)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/Addy3131/devarchitect/blob/main/LICENSE)
[![Bundle Size](https://img.shields.io/badge/bundle%20size-68%20KB-success.svg?style=flat-square)](https://bundlephobia.com/package/devarchitect-cli)
[![GitHub](https://img.shields.io/badge/GitHub-Addy3131%2Fdevarchitect-black?style=flat-square&logo=github)](https://github.com/Addy3131/devarchitect)

DevArchitect is an engineering intelligence platform that automatically maps software repositories, calculates transparent code health, prevents technical debt with the **Architecture Debt Ratchet**, and predicts change blast radius before code merges.

---

## 🚀 Quick Start (Zero Install)

Run DevArchitect on any repository instantly with `npx`:

```bash
# Run codebase health check
npx devarchitect-cli health

# Launch the visual architecture studio (in-browser)
npx devarchitect-cli studio

# Validate architectural boundaries & rules
npx devarchitect-cli validate
```

### Global Installation

```bash
npm install -g devarchitect-cli

# Run anywhere with 'devarchitect'
devarchitect health
devarchitect studio
```

---

## ⚡ Core CLI Capabilities

### 1. 🛡️ Code Health & Diagnostics
```bash
devarchitect health             # 0-100 score across 6 weighted architectural dimensions
devarchitect doctor             # Diagnoses tsconfig, entry points & framework readiness
devarchitect inspect            # Inspects components, services, hooks, routes & layers
devarchitect inspect --type component
devarchitect inspect --feature auth
```

### 2. 📊 Interactive Visual Studio & Dependency Graph
```bash
devarchitect studio             # Launches visual web studio with real-time physics canvas
devarchitect studio --port 4200 # Custom port with live in-browser codebase Q&A
devarchitect graph              # Outputs dependency graph in Mermaid format
devarchitect graph -f dot       # Outputs Graphviz DOT format
devarchitect ask "How is checkout architected?" # Graph-grounded AST architecture Q&A
```

### 3. 🚨 Policy Enforcement & Architecture Debt Ratchet
```bash
devarchitect rules              # Lists all active policy rules and presets (FSD, Clean)
devarchitect validate           # Evaluates boundary violations & circular dependency cycles
devarchitect validate --update-baseline # Freezes existing debt into baseline ratchet
```

> **The Architecture Debt Ratchet**: Stop arguing about legacy debt. Freeze existing debt into `.devarchitect/baseline.json`. In CI, `devarchitect validate` passes existing legacy debt while strictly failing on newly introduced architectural debt!

### 4. 💥 PR Blast Radius & Git Guardrails
```bash
devarchitect pr                 # Analyzes branch changes vs main with cumulative blast radius
devarchitect pr --staged        # Evaluates staged changes before git commit
devarchitect pr --pre-push      # Intercepts outgoing commits before git push
devarchitect install-hooks      # Installs zero-dependency pre-commit & pre-push guardrails
devarchitect impact <file>      # Calculates exact downstream callers for a specific file
devarchitect simulate <file>    # Pre-flight simulator: "What breaks if I change this file?"
```

### 5. 🔍 Hotspots, Bloat, Secrets & Clean Code
```bash
devarchitect env                # Audits .env.example keys & flags private secret leaks in client UI
devarchitect deps               # Detects phantom dependencies & unused zombie packages
devarchitect bloat              # Detects barrel import traps (lodash, date-fns) & server code in UI
devarchitect test-map           # Ranks untested architectural files by blast radius risk score
devarchitect deadcode           # Unused exports, functions and orphaned files
devarchitect duplication        # Identifies repeated logic blocks and duplication clusters
devarchitect rerenders          # Analyzes React inline JSX allocations & hook re-render traps
devarchitect fix --dry-run      # Preview safe automated fixes
devarchitect fix                # Apply safe automated fixes (unused types, logs, empty catches)
```

---

## 💻 VS Code & Cursor IDE Extension

Prefer real-time feedback while coding? Install the official **[DevArchitect VS Code Extension](https://marketplace.visualstudio.com/items?itemName=devarchitect.devarchitect)**:

- **🛡️ Status Bar Code Health**: Live 0–100 health score in your editor.
- **💥 Inline CodeLens Blast Radius**: Displays caller counts above exported components.
- **📊 Embedded Architecture Studio**: Interactive visual graph directly inside a VS Code tab.
- **🚨 1-Click Violation Jumps**: Click any policy violation to jump directly to the offending line.

---

## ⚙️ Configuration (`.devarchitect/config.json`)

Scaffold a recommended configuration with:

```bash
devarchitect init
```

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

## 📄 License

MIT © [DevArchitect Contributors](https://github.com/Addy3131/devarchitect/blob/main/LICENSE)

