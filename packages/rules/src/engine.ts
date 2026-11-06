import { ArchitectureRule, ArchitectureRuleContext } from './types.js';
import { ArchitectureIssue, IssueSeverity } from '@devarchitect/contracts';
import { ALL_BUILTIN_RULES, PRESET_CONFIGS } from './presets.js';

export class ArchitectureRuleEngine {
  private rules: Map<string, ArchitectureRule> = new Map();

  constructor() {
    for (const rule of ALL_BUILTIN_RULES) {
      this.registerRule(rule);
    }
  }

  public registerRule(rule: ArchitectureRule): void {
    this.rules.set(rule.id, rule);
  }

  public getRule(id: string): ArchitectureRule | undefined {
    return this.rules.get(id);
  }

  public getAllRules(): ArchitectureRule[] {
    return Array.from(this.rules.values());
  }

  public evaluate(context: ArchitectureRuleContext): ArchitectureIssue[] {
    const preset = context.config.architecture.preset || 'recommended';
    const presetRules = PRESET_CONFIGS[preset] || PRESET_CONFIGS['recommended'];
    const customRules = context.config.architecture.rules || {};

    const allIssues: ArchitectureIssue[] = [];

    for (const rule of this.rules.values()) {
      // Determine severity: user override > preset default > rule default
      const userSetting = customRules[rule.id];
      let severity: IssueSeverity | 'off' = rule.defaultSeverity;

      if (presetRules[rule.id]) {
        severity = presetRules[rule.id];
      }

      if (typeof userSetting === 'string') {
        severity = userSetting;
      } else if (userSetting && typeof userSetting === 'object' && 'severity' in userSetting) {
        severity = userSetting.severity;
      }

      if (severity === 'off') {
        continue;
      }

      try {
        const issues = rule.evaluate(context);
        for (const issue of issues) {
          allIssues.push({
            ...issue,
            severity,
          });
        }
      } catch (err) {
        // Individual rule evaluation error
      }
    }

    return allIssues;
  }
}

export const defaultRuleEngine = new ArchitectureRuleEngine();
