import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { generateFeature, generateComponent, generateService } from '@devarchitect/generator';

export async function generateCommand(
  type: string,
  name: string
): Promise<void> {
  const rootDir = process.cwd();

  if (!type || !name) {
    console.log(pc.red('\n✖ Error: Please specify generation type and name.'));
    console.log(pc.gray('  Example: devarchitect generate feature billing'));
    console.log(pc.gray('  Example: devarchitect generate component UserAvatar'));
    console.log(pc.gray('  Example: devarchitect generate service payment\n'));
    process.exit(1);
  }

  const { discovery } = await runProjectDiscovery(rootDir);
  const normalizedType = type.toLowerCase();

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT CODE GENERATOR')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Scaffolding: ${pc.bold(normalizedType)} '${pc.bold(name)}'`);
  console.log(`  Conventions: Framework: ${pc.bold(discovery.project.framework)} | Language: ${pc.bold(discovery.project.language)}\n`);

  try {
    let result;
    if (normalizedType === 'feature' || normalizedType === 'module') {
      result = generateFeature(rootDir, discovery, name);
    } else if (normalizedType === 'component') {
      result = generateComponent(rootDir, discovery, name);
    } else if (normalizedType === 'service') {
      result = generateService(rootDir, discovery, name);
    } else {
      console.log(pc.red(`✖ Unknown generator type '${type}'. Supported types: feature, component, service`));
      process.exit(1);
    }

    console.log(pc.green(`✔ Successfully scaffolded ${normalizedType} '${result.moduleName}':\n`));
    for (const file of result.createdFiles) {
      console.log(`  ${pc.green('+')} ${pc.white(file)}`);
    }
    console.log('');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`✖ Scaffolding failed: ${msg}\n`));
    process.exit(1);
  }
}
