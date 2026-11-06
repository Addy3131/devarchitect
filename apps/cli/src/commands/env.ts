import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { analyzeEnvironmentVariables } from '@devarchitect/analyzers';

export async function envCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { nodes } = await runProjectDiscovery(rootDir);
  const report = analyzeEnvironmentVariables(rootDir, nodes);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT ENVIRONMENT VARIABLES & SECRET LEAK AUDIT')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Variables Used:    ${pc.bold(String(report.usedVariables.length))}`);
  console.log(`  Total Invocations: ${pc.bold(String(report.totalOccurrences))}`);
  console.log(`  Env Files Found:   ${report.envFilesFound.length > 0 ? report.envFilesFound.join(', ') : 'None'}\n`);

  // 1. Critical Secret Leaks in Client Code
  if (report.clientSecretLeaks.length > 0) {
    console.log(pc.bgRed(pc.white(pc.bold(' 🚨 CRITICAL CLIENT SECRET LEAKS DETECTED '))));
    console.log(pc.red('  The following private environment keys are referenced in client UI files:'));
    for (const leak of report.clientSecretLeaks) {
      console.log(`    • ${pc.bold(pc.yellow(leak.variable))} in ${pc.white(leak.filePath)}:${leak.line}`);
      console.log(pc.gray(`      ${leak.riskReason}`));
    }
    console.log('');
  } else {
    console.log(pc.green('  ✔ No private server secrets leaked in client UI files.'));
  }

  // 2. Missing from .env.example
  if (report.missingFromExample.length > 0) {
    console.log(pc.yellow('\n  ⚠️ Missing from .env.example (Risk of runtime deployment crashes):'));
    console.log(pc.gray('  These variables are used in code but not documented in .env.example:'));
    for (const m of report.missingFromExample) {
      console.log(`    • ${pc.yellow(m)}`);
    }
  } else if (report.declaredInExample.length > 0) {
    console.log(pc.green('  ✔ All code environment variables are documented in .env.example.'));
  }

  // 3. Unused in Code
  if (report.unusedInCode.length > 0) {
    console.log(pc.gray(`\n  Unreferenced in Code (${report.unusedInCode.length} variables declared in .env.example but never called):`));
    for (const u of report.unusedInCode) {
      console.log(pc.gray(`    • ${u}`));
    }
  }

  // 4. Summary of all variables
  if (report.usedVariables.length > 0) {
    console.log(pc.bold('\n  Active Variables:'));
    for (const v of report.usedVariables) {
      console.log(`    • ${pc.cyan(v)}`);
    }
  }
  console.log('');
}

