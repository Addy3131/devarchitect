import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { analyzeDependencies } from '@devarchitect/analyzers';

export async function depsCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { nodes } = await runProjectDiscovery(rootDir);
  const report = analyzeDependencies(rootDir, nodes);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT PHANTOM & ZOMBIE DEPENDENCY AUDIT')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Packages Declared: ${pc.bold(String(report.totalPackagesDeclared))}`);
  console.log(`  External Packages: ${pc.bold(String(report.totalExternalImports))}\n`);

  // 1. Phantom Dependencies (imported in code but missing from package.json)
  if (report.phantomDependencies.length > 0) {
    console.log(pc.bgRed(pc.white(pc.bold(' ✖ PHANTOM DEPENDENCIES FOUND '))));
    console.log(pc.red('  These packages are imported in code but NOT declared in package.json.'));
    console.log(pc.gray('  They will fail in Docker containers and fresh CI installs!\n'));
    for (const p of report.phantomDependencies) {
      console.log(`    • ${pc.bold(pc.red(p.package))}`);
      console.log(pc.gray(`      Imported by: ${p.importedBy.join(', ')}`));
    }
    console.log('');
  } else {
    console.log(pc.green('  ✔ No phantom dependencies detected. All imports are declared in package.json.'));
  }

  // 2. Zombie Packages (declared in package.json but never imported in code)
  if (report.zombieDependencies.length > 0) {
    console.log(pc.yellow(`\n  ⚠️ Zombie Packages (${report.zombieDependencies.length} declared in package.json but never imported):`));
    console.log(pc.gray('  These packages bloat node_modules and slow down install times:\n'));
    for (const z of report.zombieDependencies) {
      console.log(`    • ${pc.yellow(z)}`);
    }
    console.log('');
  } else {
    console.log(pc.green('  ✔ No unused zombie packages detected in dependencies.'));
  }

  // 3. DevDependencies imported in production code
  if (report.devDepsInProduction.length > 0) {
    console.log(pc.yellow(`\n  ⚠️ DevDependencies Imported in Production Code:`));
    for (const d of report.devDepsInProduction) {
      console.log(`    • ${pc.yellow(d.package)} (used in: ${d.importedBy.join(', ')})`);
    }
    console.log('');
  }
}
