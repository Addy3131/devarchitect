import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  target: 'node18',
  platform: 'node',
  external: ['vscode'],
  noExternal: [
    /^@devarchitect/,
    'fast-glob',
    'ignore',
    'picocolors',
    'zod',
  ],
  sourcemap: false,
  clean: true,
  minify: true,
});
