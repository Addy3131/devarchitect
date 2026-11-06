import fs from 'node:fs';
import path from 'node:path';
import { ParsedFileResult } from '@devarchitect/parsers';
import { CONFIG_DIR } from '@devarchitect/config';

export interface CachedFileEntry {
  hash: string;
  parsed: ParsedFileResult;
  timestamp: string;
}

export interface AstCacheStore {
  version: string;
  entries: Record<string, CachedFileEntry>;
}

export class IncrementalCache {
  private cacheFilePath: string;
  private entries: Map<string, CachedFileEntry> = new Map();
  private dirty = false;

  constructor(rootDir: string) {
    this.cacheFilePath = path.join(rootDir, CONFIG_DIR, 'cache', 'ast-cache.json');
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.cacheFilePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(this.cacheFilePath, 'utf8');
      const data: AstCacheStore = JSON.parse(content);
      if (data && data.entries) {
        for (const [key, val] of Object.entries(data.entries)) {
          this.entries.set(key, val);
        }
      }
    } catch {
      // Corrupt cache file, start fresh
      this.entries.clear();
    }
  }

  public get(filePath: string, currentHash: string): ParsedFileResult | null {
    const entry = this.entries.get(filePath);
    if (!entry) {
      return null;
    }
    if (entry.hash !== currentHash) {
      return null;
    }
    return entry.parsed;
  }

  public set(filePath: string, hash: string, parsed: ParsedFileResult): void {
    this.entries.set(filePath, {
      hash,
      parsed,
      timestamp: new Date().toISOString(),
    });
    this.dirty = true;
  }

  public prune(currentFiles: Set<string>): void {
    for (const key of this.entries.keys()) {
      if (!currentFiles.has(key)) {
        this.entries.delete(key);
        this.dirty = true;
      }
    }
  }

  public save(): void {
    if (!this.dirty) {
      return;
    }

    try {
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const store: AstCacheStore = {
        version: '1.0.0',
        entries: Object.fromEntries(this.entries.entries()),
      };

      fs.writeFileSync(this.cacheFilePath, JSON.stringify(store, null, 2), 'utf8');
      this.dirty = false;
    } catch {
      // Best-effort cache save
    }
  }
}

