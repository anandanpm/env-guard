
export interface ValidationRule {
  type?: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json' | 'port';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
}

export interface CheckResult {
  valid: boolean;
  missing: string[];
  set: string[];
}

export interface InvalidVariable {
  name: string;
  value: string;
  expected: string;
  reason: string;
}

export class EnvKeeperError extends Error {
  name: 'EnvKeeperError';
  missing: string[];
  invalid: InvalidVariable[];
  
  constructor(message: string, missing?: string[], invalid?: InvalidVariable[]);
}

export class EnvKeeper {
  require(vars: string[]): boolean;
  validate(schema: Record<string, string | ValidationRule>): boolean;
  get(varName: string, defaultValue?: any, validation?: string | ValidationRule): string;
  check(vars: string[]): CheckResult;
  list(hideValues?: boolean): Record<string, string>;
}

declare const envKeeper: EnvKeeper;
export default envKeeper;
export { EnvKeeper, EnvKeeperError };