# DevArchitect

> **Understand your codebase. Improve its architecture. Engineer with confidence.**

DevArchitect is an engineering intelligence platform that automatically maps a software repository, evaluates its architecture, identifies technical debt, predicts the change blast radius of modifications, and helps engineering teams evolve their codebases safely.

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
│   ├── cli/            # Local engineering engine & developer CLI
│   ├── studio/         # Cloud / Web architecture workspace & explorer (v1.0)
│   └── api/            # Hono Cloud API & persistent storage gateway
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

### Installation

Inside the monorepo root:

```bash
# Install workspace dependencies
pnpm install

# Build all packages
pnpm run build

# Run automated test suite
pnpm run test
```

### Using the CLI Globally

To make the `devarchitect` command available anywhere on your machine:

```powershell
cd apps/cli
npm link
```

Now you can run `devarchitect` from any project folder in your terminal:

```bash
# Initialize DevArchitect in a project (scaffolds .devarchitect/config.json)
devarchitect init

# Run repository discovery & structure analysis
devarchitect analyze

# Generate a standalone HTML architecture report
devarchitect analyze --html

# Inspect categorized components, hooks, services, or routes
devarchitect inspect --type component
devarchitect inspect --feature checkout

# Check project health & configuration readiness
devarchitect doctor

# Calculate dependency blast radius before editing a file
devarchitect impact src/services/UserService.ts

# Validate against architectural rules (enforcing baseline ratchet)
devarchitect validate
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

