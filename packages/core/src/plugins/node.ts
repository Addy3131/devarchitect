import { FrameworkDetectorPlugin, FrameworkDetectionContext, FrameworkDetectionResult } from './types.js';

export const nodeDetectorPlugin: FrameworkDetectorPlugin = {
  id: 'detector-node',
  name: 'Node.js / Backend Detector',
  detect(ctx: FrameworkDetectionContext): FrameworkDetectionResult | null {
    const isNest = ctx.hasAnyDependency('@nestjs/core') || ctx.hasFile('nest-cli.json');
    const isExpress = ctx.hasAnyDependency('express');
    const isFastify = ctx.hasAnyDependency('fastify');

    if (!isNest && !isExpress && !isFastify && !ctx.hasFile('package.json')) {
      return null;
    }

    const framework = isNest ? 'nest' : isExpress ? 'express' : isFastify ? 'fastify' : 'node';

    const entryPoints: string[] = [];
    const possibleEntries = [
      'src/main.ts',
      'src/server.ts',
      'src/index.ts',
      'src/app.ts',
      'server.js',
      'index.js'
    ];
    for (const entry of possibleEntries) {
      if (ctx.hasFile(entry)) {
        entryPoints.push(entry);
      }
    }

    return {
      matched: true,
      framework,
      priority: isNest ? 60 : isExpress || isFastify ? 40 : 10,
      features: {
        prisma: ctx.hasAnyDependency('@prisma/client'),
        drizzle: ctx.hasAnyDependency('drizzle-orm'),
        testingFramework: ctx.hasAnyDependency('vitest')
          ? 'vitest'
          : ctx.hasAnyDependency('jest')
          ? 'jest'
          : null,
      },
      entryPoints,
      suggestedPresets: isNest ? ['clean-architecture', 'modular-monolith'] : ['layered', 'recommended'],
    };
  },
};

