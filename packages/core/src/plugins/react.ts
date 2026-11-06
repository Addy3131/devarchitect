import { FrameworkDetectorPlugin, FrameworkDetectionContext, FrameworkDetectionResult } from './types.js';

export const reactDetectorPlugin: FrameworkDetectorPlugin = {
  id: 'detector-react',
  name: 'React Detector',
  detect(ctx: FrameworkDetectionContext): FrameworkDetectionResult | null {
    const hasReactDep = ctx.hasAnyDependency('react');
    const isVite = ctx.hasAnyDependency('vite') || ctx.hasFile('vite.config.ts') || ctx.hasFile('vite.config.js');
    const isCRA = ctx.hasAnyDependency('react-scripts');

    if (!hasReactDep && !isVite) {
      return null;
    }

    const hasFeaturesDir = ctx.fileList.some(f =>
      f.startsWith('features/') || f.startsWith('src/features/') || f.startsWith('modules/') || f.startsWith('src/modules/')
    );

    const entryPoints: string[] = [];
    const possibleEntries = [
      'src/main.tsx',
      'src/main.jsx',
      'src/index.tsx',
      'src/index.jsx',
      'src/App.tsx',
      'src/App.jsx',
      'index.html'
    ];
    for (const entry of possibleEntries) {
      if (ctx.hasFile(entry)) {
        entryPoints.push(entry);
      }
    }

    const pkg = ctx.packageJson;
    const deps = (pkg?.dependencies as Record<string, string>) || {};
    const devDeps = (pkg?.devDependencies as Record<string, string>) || {};
    const version = deps['react'] || devDeps['react'] || deps['vite'] || devDeps['vite'];

    return {
      matched: true,
      framework: isVite ? 'vite' : 'react',
      frameworkVersion: version,
      priority: 50,
      features: {
        appRouter: false,
        pagesRouter: false,
        react: true,
        tailwind: ctx.hasAnyDependency('tailwindcss') || ctx.hasFile('tailwind.config.js') || ctx.hasFile('tailwind.config.ts'),
        zustand: ctx.hasAnyDependency('zustand'),
        tanstackQuery: ctx.hasAnyDependency('@tanstack/react-query') || ctx.hasAnyDependency('react-query'),
        redux: ctx.hasAnyDependency('@reduxjs/toolkit') || ctx.hasAnyDependency('redux'),
        prisma: ctx.hasAnyDependency('@prisma/client'),
        drizzle: ctx.hasAnyDependency('drizzle-orm'),
        featureModules: hasFeaturesDir ? 'partial' : 'none',
        testingFramework: ctx.hasAnyDependency('vitest')
          ? 'vitest'
          : ctx.hasAnyDependency('jest')
          ? 'jest'
          : null,
      },
      entryPoints,
      suggestedPresets: ['feature-sliced', 'clean-architecture', 'recommended'],
    };
  },
};

