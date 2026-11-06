# DevArchitect — VS Code & Cursor IDE Extension

> **Real-time architectural intelligence, dependency blast radius, and clean boundary guardrails inside your editor.**

---

## ⚡ Features

- **🛡️ Status Bar Code Health**: Live transparent 0–100 Code Health score and letter grade.
- **💥 Inline CodeLens Blast Radius**: See how many downstream files import the active component directly above your code before making changes.
- **🗺️ Activity Bar Sidebar**:
  - **Architecture Health**: Breakdown of complexity, coupling, maintainability, and policy violations.
  - **Active File Blast Radius**: List of all files that import the active document with 1-click jump-to-file.
- **🚀 One-Click Actions**:
  - Open DevArchitect Web Studio (`devarchitect studio`)
  - Run Health Check (`devarchitect health`)
  - Run Safe Code Fixer (`devarchitect fix`)
  - Audit Environment Variables & Secrets (`devarchitect env`)

---

## 📦 Installation & Setup

Inside the DevArchitect repository:

```bash
# Build the extension
cd apps/vscode-extension
pnpm run build
```

Press **F5** in VS Code to run the Extension Development Host and test live in any workspace!

