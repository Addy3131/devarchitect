import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    bin: 'src/bin.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  clean: true,
  dts: false,
  minify: true,
  treeshake: true,
  noExternal: [/^@devarchitect\//, 'zod', 'ignore', 'picocolors'],
  external: ['typescript', 'fast-glob', 'commander'],
});
