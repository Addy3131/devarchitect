export interface ParsedImportSpecifier {
  name: string;
  alias?: string;
  isDefault?: boolean;
  isNamespace?: boolean;
  isTypeOnly?: boolean;
}

export interface ParsedImport {
  source: string; // The literal import path, e.g. './Header' or '@/components/Header'
  specifiers: ParsedImportSpecifier[];
  isTypeOnly: boolean;
  isDynamic: boolean;
  line: number;
}

export interface ParsedExport {
  name: string;
  isDefault: boolean;
  isTypeOnly: boolean;
  line: number;
}

export interface ParsedSymbol {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'enum';
  line: number;
  complexity: number;
}

export interface ParsedFileResult {
  filePath: string;
  imports: ParsedImport[];
  exports: ParsedExport[];
  symbols: ParsedSymbol[];
  linesOfCode: number;
  complexity: number; // Max or total cyclomatic complexity
}

export interface ParserAdapter {
  id: string;
  name: string;
  supports(filePath: string): boolean;
  parse(filePath: string, content: string): ParsedFileResult;
}

