import { FrameworkDetectorPlugin, FrameworkDetectionContext, FrameworkDetectionResult } from './types.js';

export const nextjsDetectorPlugin: FrameworkDetectorPlugin = {
  id: 'detector-nextjs',
  name: 'Next.js Detector',
  detect(ctx: FrameworkDetectionContext): FrameworkDetectionResult | null {
    const hasNextDep = ctx.hasAnyDependency('next');
    const hasNextConfig = ctx.hasFile('next.config.js') || ctx.hasFile('next.config.mjs') || ctx.hasFile('next.config.ts');

    if (!hasNextDep && !hasNextConfig) {
      return null;
    }

    const hasAppRouter = ctx.fileList.some(f =>
      f.startsWith('app/') || f.startsWith('src/app/')
    );
    const hasPagesRouter = ctx.fileList.some(f =>
      f.startsWith('pages/') || f.startsWith('src/pages/')
    );

    const hasFeaturesDir = ctx.fileList.some(f =>
      f.startsWith('features/') || f.startsWith('src/features/') || f.startsWith('modules/') || f.startsWith('src/modules/')
    );

    const entryPoints: string[] = [];
    const possibleEntries = [
      'src/app/layout.tsx',
      'src/app/layout.jsx',
      'app/layout.tsx',
      'app/layout.jsx',
      'src/app/page.tsx',
      'src/app/page.jsx',
      'app/page.tsx',
      'app/page.jsx',
      'src/pages/_app.tsx',
      'src/pages/_app.jsx',
      'pages/_app.tsx',
      'pages/_app.jsx',
      'src/pages/index.tsx',
      'pages/index.tsx'
    ];
    for (const entry of possibleEntries) {
      if (ctx.hasFile(entry)) {
        entryPoints.push(entry);
      }
    }

    const pkg = ctx.packageJson;
    const deps = (pkg?.dependencies as Record<string, string>) || {};
    const devDeps = (pkg?.devDependencies as Record<string, string>) || {};
    const version = deps['next'] || devDeps['next'];

    return {
      matched: true,
      framework: 'nextjs',
      frameworkVersion: version,
      priority: 100, // Higher priority than generic React
      features: {
        appRouter: hasAppRouter,
        pagesRouter: hasPagesRouter,
        react: true,
        tailwind: ctx.hasAnyDependency('tailwindcss') || ctx.hasFile('tailwind.config.js') || ctx.hasFile('tailwind.config.ts'),
        zustand: ctx.hasAnyDependency('zustand'),
        tanstackQuery: ctx.hasAnyDependency('@tanstack/react-query') || ctx.hasAnyDependency('react-query'),
        redux: ctx.hasAnyDependency('@reduxjs/toolkit') || ctx.hasAnyDependency('redux'),
        prisma: ctx.hasAnyDependency('@prisma/client') || ctx.hasFile('prisma/schema.prisma'),
        drizzle: ctx.hasAnyDependency('drizzle-orm'),
        featureModules: hasFeaturesDir ? 'partial' : 'none',
        testingFramework: ctx.hasAnyDependency('vitest')
          ? 'vitest'
          : ctx.hasAnyDependency('jest')
          ? 'jest'
          : ctx.hasAnyDependency('@playwright/test')
          ? 'playwright'
          : null,
      },
      entryPoints,
      suggestedPresets: ['feature-sliced', 'layered', 'recommended'],
    };
  },
};

