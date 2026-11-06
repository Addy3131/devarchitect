# 🛡️ DevArchitect — Engineering Intelligence & Architectural Guardrails

> **Understand your codebase. Improve its architecture. Engineer with confidence.**

[![npm version](https://img.shields.io/npm/v/devarchitect-cli.svg?style=flat-square&color=blue&label=npm%20cli)](https://www.npmjs.com/package/devarchitect-cli)
[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/devarchitect.devarchitect.svg?style=flat-square&color=blue&label=VS%20Code%20Extension)](https://marketplace.visualstudio.com/items?itemName=devarchitect.devarchitect)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/Addy3131/devarchitect/blob/main/LICENSE)
[![Tests](https://img.shields.io/badge/tests-37%20passed-brightgreen.svg?style=flat-square)](https://github.com/Addy3131/devarchitect)
[![CLI Size](https://img.shields.io/badge/cli%20bundle-68%20KB-success.svg?style=flat-square)](https://bundlephobia.com/package/devarchitect-cli)
[![GitHub Stars](https://img.shields.io/github/stars/Addy3131/devarchitect?style=flat-square&color=yellow)](https://github.com/Addy3131/devarchitect)

DevArchitect is an engineering intelligence platform that automatically maps software repositories, calculates transparent code health, prevents technical debt with the **Architecture Debt Ratchet**, and predicts change blast radius before code merges. Available as a **high-performance CLI on npm** and a **real-time extension for VS Code & Cursor**.

---

## ⚡ Core Pillars

- **01. Understand**: Automatically index repositories, detect frameworks, language features, entry points, and structural patterns without manual configuration.
- **02. Analyze**: Measure architectural compliance, complexity, coupling, and circular dependencies through transparent, deterministic health scoring.
- **03. Improve**: Guide refactoring with dependency-aware blast radius analysis and safe migration strategies.
- **04. Protect**: Prevent architecture drift using Git hooks, CI workflows, and the **Architecture Debt Ratchet** (block new debt without halting progress on legacy debt).

---

## 📦 Monorepo Architecture

DevArchitect is built as a local-first, TypeScript monorepo powered by `pnpm` and `Turborepo`:

```
devarchitect/
├── apps/
│   ├── cli/                # Local engineering engine & developer CLI (devarchitect on npm)
│   ├── vscode-extension/   # VS Code & Cursor extension (CodeLens, Status Bar, Blast Radius)
│   ├── studio/             # Web architecture workspace & live visual canvas
│   └── api/                # Cloud API & persistent storage gateway
├── packages/
│   ├── contracts/      # Shared types, Zod schemas, Unified Project Model
│   ├── config/         # Config loaders, presets & baseline ratchet manager
│   ├── core/           # Repository discovery, framework plugins & file indexer
│   ├── graph/          # Architecture dependency graph, cycle & impact algorithms
│   ├── reporting/      # Terminal formatters, JSON reports & HTML visualizer
│   ├── parsers/        # AST and parser adapters (TypeScript compiler API)
│   ├── analyzers/      # Complexity, duplication & maintainability engines
│   └── rules/          # Architecture policy rules & presets
└── examples/
    ├── react-basic/    # React + Vite + TypeScript example
    └── nextjs-app/     # Next.js 14 App Router example
```

---

## 🚀 Quick Start

### Quick Run with npx (Zero Install)

You can run DevArchitect directly on any repository without cloning or installing:

```bash
# Run on any project instantly
npx devarchitect-cli health
npx devarchitect-cli studio
npx devarchitect-cli validate

# Or install globally
npm install -g devarchitect-cli
devarchitect health
```

### Local Workspace Setup

Inside the monorepo root:

```bash
# Install workspace dependencies
pnpm install

# Build all packages & VS Code extension
pnpm run build

# Run automated test suite
pnpm run test
```

### VS Code & Cursor IDE Extension

DevArchitect comes with a dedicated VS Code & Cursor extension located in [`apps/vscode-extension`](file:///apps/vscode-extension):
- **🛡️ Status Bar Code Health**: Live 0–100 health score & grade in the bottom bar.
- **💥 Inline CodeLens Blast Radius**: Shows exact downstream dependents above every component before you edit.
- **🗺️ Activity Bar Sidebar**: Tree view showing architecture health and active file dependents with 1-click jump-to-file.

To run the extension in development mode, open the monorepo in VS Code and press **F5** (Run Extension).

### Using the CLI Globally

To make the `devarchitect` command available anywhere on your machine:

```powershell
cd apps/cli
npm link
```

Now you can run `devarchitect` from any project folder in your terminal:

```bash
# 1. Project Initialization & Discovery
devarchitect init               # Scaffolds .devarchitect/config.json with detected preset
devarchitect analyze            # Runs repository structure analysis
devarchitect analyze --html     # Generates interactive HTML dashboard
devarchitect analyze --json     # Exports raw analysis for CI or external tools

# 2. Dependency Graph & Visualizations
devarchitect graph              # Visualizes dependencies in Mermaid format
devarchitect graph -f dot       # Visualizes in Graphviz DOT format
devarchitect graph -o graph.mmd # Exports graph to file

# 3. Transparent Code Health & Diagnostics
devarchitect health             # Computes 0-100 score across 6 weighted dimensions
devarchitect doctor             # Diagnoses tsconfig, entry points, and health readiness
devarchitect inspect            # Inspects components, hooks, services, and modules
devarchitect inspect --type component
devarchitect inspect --feature checkout

# 4. Deep Architecture Enforcement & Debt Ratchet
devarchitect rules              # Lists all architecture policy rules and presets
devarchitect validate           # Evaluates FSD/Clean Architecture boundaries & cycles
devarchitect validate --update-baseline # Freezes existing debt so new code is ratcheted

# 5. Code Quality, Hotspots & Dead Code
devarchitect complexity         # AST cyclomatic complexity hotspots & oversized files
devarchitect deadcode           # Unused exports and orphaned files
devarchitect duplication        # Duplicate logic blocks and duplicate clusters
devarchitect impact <path>      # Calculates change blast radius & dependents

# 6. Architecture Fingerprint & Drift Detection
devarchitect fingerprint        # Creates cryptographic structural fingerprint
devarchitect drift              # Compares against baseline fingerprint to flag drift

# 7. React Re-renders, TypeScript Health & Anti-Patterns
devarchitect rerenders          # Analyzes React inline JSX allocations & hook re-render traps
devarchitect types              # Scans unused types, any hotspots & duplicate type definitions
devarchitect smells             # Detects unhandled async promises, god components & empty catches

# 8. Pre-Flight Contract Break Simulator ("What will break if I change this?")
devarchitect simulate <path>    # Maps exact public contract and every downstream call site in the repo

# 9. Git PR Blast Radius, Pre-Push Rovo-Gate & Quality Hooks
devarchitect pr                 # Analyzes branch changes vs main, risk score & impact table
devarchitect pr --staged        # Analyzes staged git changes before committing
devarchitect pr --pre-push      # Intercepts outgoing commits before git push (Rovo quality gate)
devarchitect install-hooks      # Installs zero-dependency pre-commit & pre-push guardrails

# 10. Automated Safe Fixer
devarchitect fix                # Interactively fixes console logs, empty catch blocks & unused types
devarchitect fix --dry-run      # Previews proposed diffs and fixes without modifying files

# 11. Visual Interactive Studio & Codebase Q&A
devarchitect studio             # Launches high-performance visual studio with interactive canvas
devarchitect studio --port 4500 # Custom port (includes Vis.js physics, blast radius glow & in-browser Q&A)
devarchitect ask "How is checkout architected?" # Deterministic codebase Q&A grounded in AST & graph

# 12. Everyday Developer Safeguards (Env Secrets, Phantom Packages, Bloat & Tests)
devarchitect env                 # Audits missing .env.example keys & flags private secret leaks in client UI
devarchitect deps                # Detects phantom dependencies (missing in package.json) & unused zombie packages
devarchitect bloat               # Detects heavy barrel import traps (lodash, date-fns) & server modules in UI
devarchitect test-map            # Maps architectural test coverage gaps & ranks untested files by risk score

# 13. Architecture-Aware Code Scaffolding
devarchitect generate feature billing       # Scaffolds FSD-compliant feature module
devarchitect generate component UserAvatar  # Scaffolds component matching project style
devarchitect generate service payment       # Scaffolds typed service client
```

---

## 🛡️ Architecture Debt Ratchet

Legacy codebases often have existing architectural debt. Forcing developers to fix 50 legacy violations before merging a single pull request stalls engineering momentum.

DevArchitect introduces the **Architecture Debt Ratchet**:
1. Run `devarchitect validate --update-baseline` to snapshot existing debt into `.devarchitect/baseline.json`.
2. In CI, `devarchitect validate` allows baseline debt while **strictly failing on any newly introduced architecture violations**.
3. Teams progressively ratchet down the baseline as code is refactored, preventing technical debt from silently growing.

---

## 📄 License

MIT © [DevArchitect Contributors](LICENSE)

