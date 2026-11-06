import path from 'node:path';
import fs from 'node:fs';
import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { ArchitectureGraph, calculateImpact } from '@devarchitect/graph';
import { formatImpactOutput } from '@devarchitect/reporting';

export interface ImpactCommandOptions {
  staged?: boolean;
}

export async function impactCommand(targetPath?: string, options: ImpactCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();

  if (!targetPath && !options.staged) {
    console.error(pc.red('\n✖ Error: Please specify a target file path (e.g. devarchitect impact src/services/UserService.ts)\n'));
    process.exit(1);
  }

  const { nodes } = await runProjectDiscovery(rootDir);
  const graph = new ArchitectureGraph(nodes);

  // Normalize target path
  const normalizedTarget = targetPath
    ? path.relative(rootDir, path.resolve(rootDir, targetPath)).replace(/\\/g, '/')
    : '';

  const impact = calculateImpact(graph, normalizedTarget);
  console.log('\n' + formatImpactOutput(impact) + '\n');
}

