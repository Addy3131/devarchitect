import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { answerCodebaseQuestion } from '@devarchitect/analyzers';

export async function askCommand(question?: string): Promise<void> {
  const rootDir = process.cwd();

  if (!question) {
    console.error(pc.red('\n✖ Error: Please specify a question about your codebase.'));
    console.log(pc.gray('  Example: devarchitect ask "How does authentication work?"'));
    console.log(pc.gray('  Example: devarchitect ask "How does task creation flow?"\n'));
    process.exit(1);
  }

  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT AI CODEBASE INTELLIGENCE')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Question: "${pc.bold(question)}"\n`);

  const answer = answerCodebaseQuestion(
    rootDir,
    question,
    nodes,
    graph.getAllEdges(),
    graph
  );

  console.log(pc.bold(`  Topic: ${pc.cyan(answer.topic)}`));
  console.log(`  ${pc.gray(answer.summary)}\n`);

  if (answer.flowSteps.length > 0) {
    console.log(pc.bold('  Architectural Execution Flow:'));
    for (const step of answer.flowSteps) {
      console.log(`    ${pc.white(step)}`);
    }
    console.log('');
  }

  if (answer.relatedFiles.length > 0) {
    console.log(pc.bold('  Referenced Source Files:'));
    for (const file of answer.relatedFiles) {
      console.log(`    • ${pc.green(file)}`);
    }
    console.log('');
  }

  const confColor = answer.confidence === 'High' ? pc.green : pc.yellow;
  console.log(`  Confidence: ${confColor(answer.confidence)} | Evidence: ${answer.evidenceCount} indexed code references`);
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')));
}

