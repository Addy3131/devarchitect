# Contributing to DevArchitect

Thank you for contributing to DevArchitect! We are building a local-first engineering intelligence platform for developers worldwide.

## Development Workflow

1. **Prerequisites**:
   - Node.js >= 20.0.0
   - `pnpm` >= 10.0.0 (`npm install -g pnpm`)

2. **Setup**:
   ```bash
   pnpm install
   pnpm run build
   pnpm run test
   ```

3. **Package Guidelines**:
   - Every package in `packages/` must compile cleanly with `tsc`.
   - Shared contracts and schemas belong in `@devarchitect/contracts`.
   - `@devarchitect/core` must remain framework-agnostic by using framework detector plugins.
   - Core packages must never import from `apps/cli` or `apps/studio`.

4. **Testing Standards**:
   - All new features and plugins must have automated unit tests in `tests/` or alongside the package.
   - Run `pnpm run test` before submitting pull requests.

