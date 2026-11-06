import crypto from 'node:crypto';
import fs from 'node:fs';

export function calculateContentHash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function calculateFileHash(filePath: string): string {
  try {
    const buffer = fs.readFileSync(filePath);
    return calculateContentHash(buffer);
  } catch {
    return '';
  }
}

