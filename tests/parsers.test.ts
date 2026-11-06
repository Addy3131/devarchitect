import { describe, it, expect } from 'vitest';
import { TypeScriptParserAdapter } from '../packages/parsers/src/typescript-adapter.js';
import { ImportResolver } from '../packages/parsers/src/resolver.js';

describe('TypeScriptParserAdapter', () => {
  const parser = new TypeScriptParserAdapter();

  it('correctly extracts imports and specifiers', () => {
    const code = `
      import React, { useState, useEffect } from 'react';
      import type { Product } from './types';
      import * as utils from '@/utils';
      const dynamicModule = import('./lazyComponent');
    `;

    const result = parser.parse('src/test.tsx', code);

    expect(result.imports.length).toBe(4);
    // React import
    const reactImport = result.imports.find(i => i.source === 'react');
    expect(reactImport).toBeDefined();
    expect(reactImport?.specifiers.some(s => s.name === 'React' && s.isDefault)).toBe(true);
    expect(reactImport?.specifiers.some(s => s.name === 'useState')).toBe(true);

    // Type only import
    const typeImport = result.imports.find(i => i.source === './types');
    expect(typeImport?.isTypeOnly).toBe(true);

    // Namespace import
    const nsImport = result.imports.find(i => i.source === '@/utils');
    expect(nsImport?.specifiers.some(s => s.isNamespace)).toBe(true);

    // Dynamic import
    const dynImport = result.imports.find(i => i.source === './lazyComponent');
    expect(dynImport?.isDynamic).toBe(true);
  });

  it('correctly extracts exports and symbols', () => {
    const code = `
      export interface User { id: string; }
      export const API_URL = 'https://api.example.com';
      export function getUser(id: string) {
        if (!id) return null;
        return { id };
      }
      export default class UserService {}
    `;

    const result = parser.parse('src/service.ts', code);

    expect(result.exports.some(e => e.name === 'User' && e.isTypeOnly)).toBe(true);
    expect(result.exports.some(e => e.name === 'API_URL')).toBe(true);
    expect(result.exports.some(e => e.name === 'getUser')).toBe(true);
    expect(result.exports.some(e => e.name === 'default' && e.isDefault)).toBe(true);
  });

  it('calculates cyclomatic complexity based on control flow branches', () => {
    const simpleCode = `
      export function add(a: number, b: number) {
        return a + b;
      }
    `;
    const complexCode = `
      export function calculate(a: number, b: number, flag: boolean) {
        if (a > 10) {
          for (let i = 0; i < b; i++) {
            if (flag && i % 2 === 0) {
              console.log(i);
            }
          }
        } else {
          switch (a) {
            case 1: return 10;
            case 2: return 20;
            default: return 0;
          }
        }
        return flag ? a : b;
      }
    `;

    const simpleResult = parser.parse('src/simple.ts', simpleCode);
    const complexResult = parser.parse('src/complex.ts', complexCode);

    expect(simpleResult.complexity).toBe(1);
    expect(complexResult.complexity).toBeGreaterThan(5);
  });
});

describe('ImportResolver', () => {
  const rootDir = '/project';
  const fileList = [
    'src/index.ts',
    'src/App.tsx',
    'src/components/Header.tsx',
    'src/components/index.ts',
    'src/features/checkout/CheckoutForm.tsx',
    'src/services/api.ts'
  ];
  const aliases = [
    { prefix: '@/*', targets: ['src/*'] }
  ];

  const resolver = new ImportResolver(rootDir, fileList, aliases);

  it('resolves relative imports with extension omission', () => {
    const res = resolver.resolve('src/App.tsx', './components/Header');
    expect(res.isExternal).toBe(false);
    expect(res.target).toBe('src/components/Header.tsx');
  });

  it('resolves relative imports pointing to directory index', () => {
    const res = resolver.resolve('src/App.tsx', './components');
    expect(res.isExternal).toBe(false);
    expect(res.target).toBe('src/components/index.ts');
  });

  it('resolves path aliases configured in tsconfig', () => {
    const res = resolver.resolve('src/features/checkout/CheckoutForm.tsx', '@/services/api');
    expect(res.isExternal).toBe(false);
    expect(res.target).toBe('src/services/api.ts');
  });

  it('identifies external npm packages correctly', () => {
    const res1 = resolver.resolve('src/App.tsx', 'react');
    expect(res1.isExternal).toBe(true);
    expect(res1.target).toBe('react');

    const res2 = resolver.resolve('src/App.tsx', '@tanstack/react-query');
    expect(res2.isExternal).toBe(true);
    expect(res2.target).toBe('@tanstack/react-query');
  });
});

