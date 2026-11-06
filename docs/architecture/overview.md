# DevArchitect Architecture Overview

DevArchitect operates on a unified engineering pipeline designed to be local-first, deterministic, and extensible.

## Unified Project Model

Every analyzer, parser, and plugin produces structured data adhering to `@devarchitect/contracts`:

- **`ProjectNode`**: Identifies source files, categorized roles (components, hooks, services, routes, utilities, tests), LOC, and architectural layers.
- **`ProjectEdge`**: Represents directed dependency relationships (imports, calls, uses).
- **`ArchitectureIssue`**: Represents a rule violation (circular dependency, cross-layer leakage, layer breach) with line-level evidence and suggested remediation.
- **`ProjectDiscovery`**: Summarizes framework detection, runtime, package manager, and entry points.

## Analysis Pipeline

```
Repository Source Code
       │
       ▼
File Discovery & Ignore Filtering (.gitignore, .devarchitect/config.json)
       │
       ▼
Framework Plugins (Next.js, Vite, React, Vue, Nest, Node)
       │
       ▼
File Role Categorization & Content Hashing
       │
       ▼
Architecture Graph Construction & Cycle Detection
       │
       ▼
Policy Evaluation & Architecture Debt Ratchet
       │
       ▼
Outputs: Terminal UI / JSON Export / HTML Dashboard / Studio Cloud API
```

## Local-First & Privacy Guarantee

- Source code analysis executes completely on the developer's local machine.
- No source code or secrets (`.env`) are uploaded or shared.
- AI integrations are hybrid and opt-in: AI provides advice and interpretations, while deterministic AST and graph engines verify facts and enforce rules.

