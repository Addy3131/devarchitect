import fs from 'node:fs';
import path from 'node:path';
import { ProjectDiscovery } from '@devarchitect/contracts';

export interface ScaffoldingResult {
  createdFiles: string[];
  moduleName: string;
}

export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase());
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function generateFeature(
  rootDir: string,
  discovery: ProjectDiscovery,
  featureName: string
): ScaffoldingResult {
  const normName = featureName.toLowerCase();
  const pascal = toPascalCase(featureName);
  const camel = toCamelCase(featureName);

  // Determine features base dir: src/features or features
  const srcExists = fs.existsSync(path.join(rootDir, 'src'));
  const baseDir = srcExists
    ? path.join(rootDir, 'src', 'features', normName)
    : path.join(rootDir, 'features', normName);

  const compDir = path.join(baseDir, 'components');
  const hooksDir = path.join(baseDir, 'hooks');
  const servicesDir = path.join(baseDir, 'services');
  const typesDir = path.join(baseDir, 'types');

  fs.mkdirSync(compDir, { recursive: true });
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.mkdirSync(servicesDir, { recursive: true });
  fs.mkdirSync(typesDir, { recursive: true });

  const isTs = discovery.project.language !== 'JavaScript';
  const ext = isTs ? 'ts' : 'js';
  const jsxExt = isTs ? 'tsx' : 'jsx';

  const createdFiles: string[] = [];

  // 1. types file
  const typesContent = isTs
    ? `export interface ${pascal}Item {\n  id: string;\n  name: string;\n  createdAt: string;\n}\n`
    : `// Types for ${pascal}\n`;
  const typesPath = path.join(typesDir, `index.${ext}`);
  fs.writeFileSync(typesPath, typesContent, 'utf8');
  createdFiles.push(path.relative(rootDir, typesPath).replace(/\\/g, '/'));

  // 2. Service file
  const serviceContent = `import type { ${pascal}Item } from '../types/index.js';

export async function fetch${pascal}List(): Promise<${pascal}Item[]> {
  // Replace with API endpoint call
  return [
    { id: '1', name: '${pascal} 1', createdAt: new Date().toISOString() },
  ];
}
`;
  const servicePath = path.join(servicesDir, `${camel}Service.${ext}`);
  fs.writeFileSync(servicePath, serviceContent, 'utf8');
  createdFiles.push(path.relative(rootDir, servicePath).replace(/\\/g, '/'));

  // 3. Hook file
  const hookContent = `import { useState, useEffect } from 'react';
import { fetch${pascal}List } from '../services/${camel}Service.js';
import type { ${pascal}Item } from '../types/index.js';

export function use${pascal}() {
  const [data, setData] = useState<${pascal}Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch${pascal}List().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
`;
  const hookPath = path.join(hooksDir, `use${pascal}.${ext}`);
  fs.writeFileSync(hookPath, hookContent, 'utf8');
  createdFiles.push(path.relative(rootDir, hookPath).replace(/\\/g, '/'));

  // 4. Component file
  const compContent = `import React from 'react';
import { use${pascal} } from '../hooks/use${pascal}.js';

export function ${pascal}View() {
  const { data, loading } = use${pascal}();

  if (loading) return <div className="p-4">Loading ${pascal}...</div>;

  return (
    <section className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">${pascal} Overview</h2>
      <ul>
        {data.map(item => (
          <li key={item.id} className="py-1">{item.name}</li>
        ))}
      </ul>
    </section>
  );
}
`;
  const compPath = path.join(compDir, `${pascal}View.${jsxExt}`);
  fs.writeFileSync(compPath, compContent, 'utf8');
  createdFiles.push(path.relative(rootDir, compPath).replace(/\\/g, '/'));

  // 5. Public index.ts API export
  const indexContent = `// Public API for ${pascal} feature
export * from './components/${pascal}View.js';
export * from './hooks/use${pascal}.js';
export * from './services/${camel}Service.js';
export * from './types/index.js';
`;
  const indexPath = path.join(baseDir, `index.${ext}`);
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  createdFiles.push(path.relative(rootDir, indexPath).replace(/\\/g, '/'));

  return {
    createdFiles,
    moduleName: normName,
  };
}

export function generateComponent(
  rootDir: string,
  discovery: ProjectDiscovery,
  componentName: string,
  targetDir?: string
): ScaffoldingResult {
  const pascal = toPascalCase(componentName);
  const srcExists = fs.existsSync(path.join(rootDir, 'src'));
  const destination = targetDir
    ? path.resolve(rootDir, targetDir)
    : srcExists
    ? path.join(rootDir, 'src', 'components')
    : path.join(rootDir, 'components');

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const isTs = discovery.project.language !== 'JavaScript';
  const jsxExt = isTs ? 'tsx' : 'jsx';

  const content = `import React from 'react';

${isTs ? `export interface ${pascal}Props {\n  title?: string;\n  className?: string;\n}\n` : ''}
export function ${pascal}(${isTs ? `{ title = '${pascal}', className = '' }: ${pascal}Props` : '{ title, className }'}) {
  return (
    <div className={\`p-4 \${className}\`}>
      <h3 className="font-semibold">{title}</h3>
    </div>
  );
}
`;

  const filePath = path.join(destination, `${pascal}.${jsxExt}`);
  fs.writeFileSync(filePath, content, 'utf8');

  return {
    createdFiles: [path.relative(rootDir, filePath).replace(/\\/g, '/')],
    moduleName: pascal,
  };
}

export function generateService(
  rootDir: string,
  discovery: ProjectDiscovery,
  serviceName: string
): ScaffoldingResult {
  const camel = toCamelCase(serviceName);
  const pascal = toPascalCase(serviceName);
  const srcExists = fs.existsSync(path.join(rootDir, 'src'));
  const destination = srcExists
    ? path.join(rootDir, 'src', 'services')
    : path.join(rootDir, 'services');

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const isTs = discovery.project.language !== 'JavaScript';
  const ext = isTs ? 'ts' : 'js';

  const content = `${isTs ? `export interface ${pascal}Response {\n  success: boolean;\n  data: unknown;\n}\n` : ''}
export async function execute${pascal}(): Promise<${isTs ? `${pascal}Response` : 'any'}> {
  return {
    success: true,
    data: null,
  };
}
`;

  const fileName = camel.endsWith('Service') ? `${camel}.${ext}` : `${camel}Service.${ext}`;
  const filePath = path.join(destination, fileName);
  fs.writeFileSync(filePath, content, 'utf8');

  return {
    createdFiles: [path.relative(rootDir, filePath).replace(/\\/g, '/')],
    moduleName: pascal,
  };
}
