import {
  FrameworkType,
  DetectedFeatures,
  PackageManager,
  Language
} from '@devarchitect/contracts';

export interface FrameworkDetectionContext {
  rootDir: string;
  packageJson: Record<string, unknown> | null;
  fileList: string[]; // relative paths from rootDir
  hasFile: (relativePath: string) => boolean;
  hasDependency: (depName: string) => boolean;
  hasDevDependency: (depName: string) => boolean;
  hasAnyDependency: (depName: string) => boolean;
}

export interface FrameworkDetectionResult {
  matched: boolean;
  framework: FrameworkType;
  frameworkVersion?: string;
  priority: number; // higher priority wins if multiple match (e.g. Next.js > React)
  features?: Partial<DetectedFeatures>;
  entryPoints?: string[];
  suggestedPresets?: string[];
}

export interface FrameworkDetectorPlugin {
  id: string;
  name: string;
  detect: (context: FrameworkDetectionContext) => Promise<FrameworkDetectionResult | null> | FrameworkDetectionResult | null;
}

