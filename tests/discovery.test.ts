import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { runProjectDiscovery } from '../packages/core/src/index.js';

describe('Discovery Engine', () => {
  const reactExampleDir = path.resolve(__dirname, '../examples/react-basic');
  const nextjsExampleDir = path.resolve(__dirname, '../examples/nextjs-app');

  it('accurately discovers React + Vite project', async () => {
    const { discovery, nodes } = await runProjectDiscovery(reactExampleDir);

    expect(discovery.project.framework).toBe('vite');
    expect(discovery.detected.react).toBe(true);
    expect(discovery.detected.tailwind).toBe(true);
    expect(discovery.detected.zustand).toBe(true);
    expect(discovery.detected.tanstackQuery).toBe(true);
    expect(discovery.detected.featureModules).toBe('partial');

    expect(discovery.stats.components).toBeGreaterThanOrEqual(2);
    expect(discovery.stats.hooks).toBeGreaterThanOrEqual(2);
    expect(discovery.stats.services).toBeGreaterThanOrEqual(1);
    expect(discovery.stats.utilities).toBeGreaterThanOrEqual(1);
    expect(discovery.stats.features).toBeGreaterThanOrEqual(1);

    expect(discovery.typeScript.exists).toBe(true);
    expect(discovery.typeScript.pathAliases.length).toBeGreaterThan(0);
    expect(discovery.entryPoints).toContain('src/main.tsx');

    // Check specific nodes
    const checkoutNode = nodes.find(n => n.path.includes('CheckoutForm.tsx'));
    expect(checkoutNode).toBeDefined();
    expect(checkoutNode?.feature).toBe('checkout');
    expect(checkoutNode?.type).toBe('component');
  });

  it('accurately discovers Next.js App Router project', async () => {
    const { discovery, nodes } = await runProjectDiscovery(nextjsExampleDir);

    expect(discovery.project.framework).toBe('nextjs');
    expect(discovery.detected.appRouter).toBe(true);
    expect(discovery.detected.react).toBe(true);
    expect(discovery.detected.tailwind).toBe(true);
    expect(discovery.entryPoints).toContain('src/app/layout.tsx');

    expect(discovery.stats.routes).toBeGreaterThanOrEqual(3);
    expect(discovery.stats.components).toBeGreaterThanOrEqual(2);
    expect(discovery.stats.services).toBeGreaterThanOrEqual(1);

    const routeNode = nodes.find(n => n.path.includes('src/app/api/auth/route.ts'));
    expect(routeNode).toBeDefined();
    expect(routeNode?.type).toBe('route');

    const authServiceNode = nodes.find(n => n.path.includes('authService.ts'));
    expect(authServiceNode).toBeDefined();
    expect(authServiceNode?.feature).toBe('auth');
    expect(authServiceNode?.type).toBe('service');
  });

  it('handles empty / non-configured directory gracefully without crashing', async () => {
    const emptyDir = path.resolve(__dirname, '../infrastructure');
    const { discovery } = await runProjectDiscovery(emptyDir);

    expect(discovery.project.framework).toBe('unknown');
    expect(discovery.stats.totalFiles).toBeGreaterThanOrEqual(0);
  });
});

