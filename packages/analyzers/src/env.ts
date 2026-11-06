import fs from 'node:fs';
import path from 'node:path';
import { ProjectNode } from '@devarchitect/contracts';

export interface EnvReference {
  variable: string;
  filePath: string;
  line: number;
  isClientFile: boolean;
}

export interface ClientSecretLeak {
  variable: string;
  filePath: string;
  line: number;
  riskReason: string;
}

export interface EnvAuditReport {
  usedVariables: string[];
  declaredInExample: string[];
  missingFromExample: string[];
  unusedInCode: string[];
  clientSecretLeaks: ClientSecretLeak[];
  envFilesFound: string[];
  totalOccurrences: number;
}

const SECRET_PATTERNS = [
  /SECRET/i,
  /PRIVATE/i,
  /PASSWORD/i,
  /DB_PASS/i,
  /DATABASE_URL/i,
  /AUTH_TOKEN/i,
  /ACCESS_TOKEN/i,
  /API_KEY/i,
  /CREDENTIALS/i,
  /SIGNING_KEY/i,
];

const PUBLIC_PREFIXES = [
  'NEXT_PUBLIC_',
  'VITE_',
  'PUBLIC_',
  'REACT_APP_',
  'NUXT_PUBLIC_',
];

export function analyzeEnvironmentVariables(
  rootDir: string,
  nodes: ProjectNode[]
): EnvAuditReport {
  // 1. Locate and parse env example files
  const candidateExampleFiles = ['.env.example', '.env.template', '.env.sample'];
  let exampleFile: string | null = null;
  const declaredInExample = new Set<string>();

  for (const name of candidateExampleFiles) {
    const full = path.join(rootDir, name);
    if (fs.existsSync(full)) {
      exampleFile = name;
      const content = fs.readFileSync(full, 'utf8');
      parseEnvLines(content, declaredInExample);
      break;
    }
  }

  // Check other env files present
  const allEnvCandidates = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test',
    ...candidateExampleFiles,
  ];
  const envFilesFound = allEnvCandidates.filter(f => fs.existsSync(path.join(rootDir, f)));

  // 2. Scan nodes for process.env and import.meta.env references
  const usedVarsMap = new Map<string, EnvReference[]>();
  const clientSecretLeaks: ClientSecretLeak[] = [];
  let totalOccurrences = 0;

  const envRegex = /(?:process\.env|import\.meta\.env)(?:\.([a-zA-Z0-9_]+)|\[['"]([a-zA-Z0-9_]+)['"]\])/g;

  for (const node of nodes) {
    // Only inspect source files (skip configs/tests)
    if (node.type === 'config' || node.type === 'asset') continue;

    const fullPath = path.isAbsolute(node.path) ? node.path : path.join(rootDir, node.path);
    if (!fs.existsSync(fullPath)) continue;

    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const isClient =
      node.type === 'component' ||
      node.type === 'route' ||
      node.path.includes('/components/') ||
      node.path.includes('/ui/') ||
      node.path.endsWith('.tsx') ||
      node.path.endsWith('.jsx');

    const lines = content.split(/\r?\n/);
    lines.forEach((lineText, idx) => {
      let match: RegExpExecArray | null;
      while ((match = envRegex.exec(lineText)) !== null) {
        const varName = match[1] || match[2];
        if (!varName || varName === 'NODE_ENV') continue;

        totalOccurrences++;
        const ref: EnvReference = {
          variable: varName,
          filePath: node.path,
          line: idx + 1,
          isClientFile: isClient,
        };

        if (!usedVarsMap.has(varName)) {
          usedVarsMap.set(varName, []);
        }
        usedVarsMap.get(varName)!.push(ref);

        // 3. Security Leak Detection: Is a private secret used in client code?
        const isPublicPrefixed = PUBLIC_PREFIXES.some(prefix => varName.startsWith(prefix));
        if (isClient && !isPublicPrefixed) {
          const isSecret = SECRET_PATTERNS.some(pat => pat.test(varName));
          if (isSecret) {
            clientSecretLeaks.push({
              variable: varName,
              filePath: node.path,
              line: idx + 1,
              riskReason: `Potential backend secret '${varName}' referenced in client UI file without public prefix (${PUBLIC_PREFIXES.join(', ')})`,
            });
          }
        }
      }
    });
  }

  const usedVariables = Array.from(usedVarsMap.keys()).sort();
  const declaredExampleList = Array.from(declaredInExample).sort();

  // Missing from .env.example
  const missingFromExample = exampleFile
    ? usedVariables.filter(v => !declaredInExample.has(v))
    : [];

  // Declared in example but never used
  const unusedInCode = exampleFile
    ? declaredExampleList.filter(v => !usedVarsMap.has(v))
    : [];

  return {
    usedVariables,
    declaredInExample: declaredExampleList,
    missingFromExample,
    unusedInCode,
    clientSecretLeaks,
    envFilesFound,
    totalOccurrences,
  };
}

function parseEnvLines(content: string, outSet: Set<string>): void {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      if (/^[a-zA-Z0-9_]+$/.test(key)) {
        outSet.add(key);
      }
    } else if (/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      outSet.add(trimmed);
    }
  }
}

