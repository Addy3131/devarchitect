import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { formatDiscoveryOutput, generateHtmlReport } from '@devarchitect/reporting';
import { CONFIG_DIR } from '@devarchitect/config';

export interface AnalyzeCommandOptions {
  json?: boolean;
  output?: string;
  html?: boolean;
}

export async function analyzeCommand(options: AnalyzeCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();

  try {
    const { discovery, nodes } = await runProjectDiscovery(rootDir);

    if (options.json) {
      const outputJson = JSON.stringify({ discovery, nodes }, null, 2);
      if (options.output) {
        fs.writeFileSync(options.output, outputJson, 'utf8');
        console.log(pc.green(`✔ Exported analysis to ${options.output}`));
      } else {
        console.log(outputJson);
      }
      return;
    }

    // Default terminal output
    console.log('\n' + formatDiscoveryOutput(discovery) + '\n');

    // Auto-save analysis report in .devarchitect/reports if directory exists
    const reportsDir = path.join(rootDir, CONFIG_DIR, 'reports');
    if (fs.existsSync(reportsDir)) {
      const reportJsonPath = path.join(reportsDir, 'discovery-report.json');
      fs.writeFileSync(reportJsonPath, JSON.stringify(discovery, null, 2), 'utf8');
    }

    if (options.html) {
      const html = generateHtmlReport({ discovery });
      const htmlPath = options.output || path.join(rootDir, CONFIG_DIR, 'reports', 'report.html');
      const dir = path.dirname(htmlPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(pc.green(`✔ Generated HTML architecture report at ${htmlPath}\n`));
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(pc.red(`\n✖ Analysis failed: ${msg}\n`));
    process.exit(1);
  }
}

