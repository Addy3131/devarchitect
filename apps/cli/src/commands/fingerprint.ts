import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { createArchitectureFingerprint, calculateArchitectureDrift, ArchitectureFingerprint } from '@devarchitect/analyzers';
import { detectCycles } from '@devarchitect/graph';
import { CONFIG_DIR } from '@devarchitect/config';

export async function fingerprintCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);
  const cycles = detectCycles(graph);

  const fingerprint = createArchitectureFingerprint(
    discovery.project,
    nodes,
    graph.getAllEdges(),
    cycles.length
  );

  const savePath = path.join(rootDir, CONFIG_DIR, 'fingerprint.json');
  const dir = path.dirname(savePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(savePath, JSON.stringify(fingerprint, null, 2), 'utf8');

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT ARCHITECTURE FINGERPRINT')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Project:         ${pc.bold(fingerprint.projectName)}`);
  console.log(`  Fingerprint SHA: ${pc.bold(fingerprint.hash.slice(0, 16))}...`);
  console.log(`  Module Slices:   ${fingerprint.summary.modulesCount}`);
  console.log(`  Edges Signature: ${fingerprint.summary.edgeCount}`);
  console.log(`  Cycles:          ${fingerprint.summary.cycleCount}`);
  console.log(`  Total LOC:       ${fingerprint.summary.totalLoc.toLocaleString()}`);
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.green(`✔ Saved reproducible architecture fingerprint to ${savePath}\n`));
}

export async function driftCommand(): Promise<void> {
  const rootDir = process.cwd();
  const fingerprintPath = path.join(rootDir, CONFIG_DIR, 'fingerprint.json');

  if (!fs.existsSync(fingerprintPath)) {
    console.log(pc.yellow(`\n⚠ No saved architecture fingerprint found at ${fingerprintPath}.`));
    console.log(pc.gray('  Run `devarchitect fingerprint` first to create an architecture baseline snapshot.\n'));
    return;
  }

  const raw = fs.readFileSync(fingerprintPath, 'utf8');
  const previous: ArchitectureFingerprint = JSON.parse(raw);

  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);
  const cycles = detectCycles(graph);

  const current = createArchitectureFingerprint(
    discovery.project,
    nodes,
    graph.getAllEdges(),
    cycles.length
  );

  const drift = calculateArchitectureDrift(previous, current);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT ARCHITECTURE DRIFT DETECTION')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Baseline Date:  ${new Date(drift.previousTimestamp).toLocaleString()}`);
  console.log(`  Current Date:   ${new Date(drift.currentTimestamp).toLocaleString()}`);

  const driftColor = drift.driftScore > 20 ? pc.red : drift.driftScore > 5 ? pc.yellow : pc.green;
  console.log(`  Drift Score:    ${driftColor(pc.bold(`${drift.driftScore}%`))} ${drift.hasDiverged ? pc.yellow('[DIVERGED]') : pc.green('[IDENTICAL]')}\n`);

  if (!drift.hasDiverged) {
    console.log(pc.green('  ✔ Architecture is 100% compliant with baseline fingerprint. No drift detected.\n'));
    return;
  }

  if (drift.changes.newBoundaries.length > 0) {
    console.log(pc.bold('  New Module Boundaries:'));
    for (const b of drift.changes.newBoundaries) console.log(`    ${pc.green('+')} ${b}`);
    console.log('');
  }

  if (drift.changes.removedBoundaries.length > 0) {
    console.log(pc.bold('  Removed Module Boundaries:'));
    for (const b of drift.changes.removedBoundaries) console.log(`    ${pc.red('-')} ${b}`);
    console.log('');
  }

  if (drift.changes.addedEdges.length > 0) {
    console.log(pc.bold(`  Newly Introduced Couplings (${drift.changes.addedEdges.length}):`));
    for (const edge of drift.changes.addedEdges.slice(0, 10)) {
      console.log(`    ${pc.yellow('→')} ${edge}`);
    }
    if (drift.changes.addedEdges.length > 10) {
      console.log(pc.gray(`    ... and ${drift.changes.addedEdges.length - 10} more`));
    }
    console.log('');
  }

  console.log(pc.gray(`  LOC Delta: ${drift.changes.locDelta >= 0 ? '+' : ''}${drift.changes.locDelta} LOC\n`));
}
