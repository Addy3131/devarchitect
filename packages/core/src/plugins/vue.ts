import { FrameworkDetectorPlugin, FrameworkDetectionContext, FrameworkDetectionResult } from './types.js';

export const vueDetectorPlugin: FrameworkDetectorPlugin = {
  id: 'detector-vue',
  name: 'Vue / Nuxt Detector',
  detect(ctx: FrameworkDetectionContext): FrameworkDetectionResult | null {
    const isNuxt = ctx.hasAnyDependency('nuxt') || ctx.hasFile('nuxt.config.ts') || ctx.hasFile('nuxt.config.js');
    const hasVueDep = ctx.hasAnyDependency('vue');

    if (!isNuxt && !hasVueDep) {
      return null;
    }

    const entryPoints: string[] = [];
    const possibleEntries = ['src/main.ts', 'src/main.js', 'src/App.vue', 'app.vue'];
    for (const entry of possibleEntries) {
      if (ctx.hasFile(entry)) {
        entryPoints.push(entry);
      }
    }

    return {
      matched: true,
      framework: isNuxt ? 'nuxt' : 'vue',
      priority: isNuxt ? 90 : 45,
      features: {
        react: false,
        tailwind: ctx.hasAnyDependency('tailwindcss'),
        testingFramework: ctx.hasAnyDependency('vitest') ? 'vitest' : null,
      },
      entryPoints,
      suggestedPresets: ['layered', 'recommended'],
    };
  },
};

