import { FrameworkDetectorPlugin, FrameworkDetectionContext, FrameworkDetectionResult } from './types.js';
import { nextjsDetectorPlugin } from './nextjs.js';
import { reactDetectorPlugin } from './react.js';
import { vueDetectorPlugin } from './vue.js';
import { nodeDetectorPlugin } from './node.js';

export class FrameworkPluginRegistry {
  private plugins: FrameworkDetectorPlugin[] = [];

  constructor() {
    this.registerBuiltins();
  }

  private registerBuiltins(): void {
    this.register(nextjsDetectorPlugin);
    this.register(reactDetectorPlugin);
    this.register(vueDetectorPlugin);
    this.register(nodeDetectorPlugin);
  }

  public register(plugin: FrameworkDetectorPlugin): void {
    // Prevent duplicate registrations by id
    this.plugins = this.plugins.filter(p => p.id !== plugin.id);
    this.plugins.push(plugin);
  }

  public getPlugins(): readonly FrameworkDetectorPlugin[] {
    return this.plugins;
  }

  public async detect(context: FrameworkDetectionContext): Promise<FrameworkDetectionResult> {
    const results: FrameworkDetectionResult[] = [];

    for (const plugin of this.plugins) {
      try {
        const result = await plugin.detect(context);
        if (result && result.matched) {
          results.push(result);
        }
      } catch (err) {
        // Continue detection if one plugin throws
      }
    }

    if (results.length === 0) {
      return {
        matched: false,
        framework: 'unknown',
        priority: 0,
        features: {},
        entryPoints: [],
        suggestedPresets: ['recommended'],
      };
    }

    // Sort descending by priority
    results.sort((a, b) => b.priority - a.priority);

    // Merge detected features, preferring higher priority
    const bestMatch = results[0];
    const mergedFeatures = results.reduceRight(
      (acc, res) => ({ ...acc, ...res.features }),
      bestMatch.features || {}
    );
    const allEntryPoints = Array.from(new Set(results.flatMap(r => r.entryPoints || [])));

    return {
      ...bestMatch,
      features: mergedFeatures,
      entryPoints: allEntryPoints,
    };
  }
}

export const defaultPluginRegistry = new FrameworkPluginRegistry();

