
class EnvKeeperError extends Error {
  constructor(message, missing = [], invalid = []) {
    super(message);
    this.name = 'EnvKeeperError';
    this.missing = missing;
    this.invalid = invalid;
  }
}

class EnvKeeper {
  /**
   * Require specific environment variables to be set
   * @param {string[]} vars - Array of required environment variable names
   * @throws {EnvKeeperError} If any variables are missing
   */
  require(vars) {
    if (!Array.isArray(vars)) {
      throw new Error('Variables must be provided as an array');
    }

    const missing = vars.filter(varName => {
      const value = process.env[varName];
      return value === undefined || value === '';
    });

    if (missing.length > 0) {
      const message = `Missing required environment variables: ${missing.join(', ')}`;
      throw new EnvKeeperError(message, missing);
    }

    return true;
  }

  /**
   * Validate environment variables with type checking
   * @param {Object} schema - Validation schema
   * @throws {EnvKeeperError} If validation fails
   */
  validate(schema) {
    if (typeof schema !== 'object' || schema === null) {
      throw new Error('Schema must be an object');
    }

    const missing = [];
    const invalid = [];

    for (const [varName, validation] of Object.entries(schema)) {
      const value = process.env[varName];

      // Check if variable exists
      if (value === undefined || value === '') {
        missing.push(varName);
        continue;
      }

      // Normalize validation to object format
      const rules = typeof validation === 'string' 
        ? { type: validation } 
        : validation;

      // Validate type
      if (rules.type) {
        const isValid = this._validateType(value, rules.type);
        if (!isValid) {
          invalid.push({
            name: varName,
            value,
            expected: rules.type,
            reason: `Expected ${rules.type}, got "${value}"`
          });
          continue;
        }
      }

      // Validate additional rules
      if (rules.minLength && value.length < rules.minLength) {
        invalid.push({
          name: varName,
          value: value.substring(0, 10) + '...',
          expected: `minimum length ${rules.minLength}`,
          reason: `Length ${value.length} is less than required ${rules.minLength}`
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        invalid.push({
          name: varName,
          value: value.substring(0, 10) + '...',
          expected: `maximum length ${rules.maxLength}`,
          reason: `Length ${value.length} exceeds maximum ${rules.maxLength}`
        });
      }

      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        invalid.push({
          name: varName,
          value: value.substring(0, 10) + '...',
          expected: `pattern ${rules.pattern}`,
          reason: `Value does not match required pattern`
        });
      }

      if (rules.enum && !rules.enum.includes(value)) {
        invalid.push({
          name: varName,
          value,
          expected: `one of: ${rules.enum.join(', ')}`,
          reason: `Value must be one of: ${rules.enum.join(', ')}`
        });
      }
    }

    if (missing.length > 0 || invalid.length > 0) {
      let message = '';
      
      if (missing.length > 0) {
        message += `Missing environment variables: ${missing.join(', ')}`;
      }
      
      if (invalid.length > 0) {
        if (message) message += '\n';
        message += 'Invalid environment variables:\n';
        invalid.forEach(item => {
          message += `  - ${item.name}: ${item.reason}\n`;
        });
      }

      throw new EnvKeeperError(message.trim(), missing, invalid);
    }

    return true;
  }

  /**
   * Get environment variable with default value and optional validation
   * @param {string} varName - Environment variable name
   * @param {*} defaultValue - Default value if not set
   * @param {string|Object} validation - Optional validation rules
   */
  get(varName, defaultValue = null, validation = null) {
    let value = process.env[varName];
    
    if (value === undefined || value === '') {
      if (defaultValue === null) {
        throw new EnvKeeperError(`Environment variable ${varName} is required`);
      }
      value = String(defaultValue);
    }

    if (validation) {
      try {
        this.validate({ [varName]: validation });
      } catch (error) {
        // Re-throw with the actual value (including default)
        process.env[varName] = value;
        this.validate({ [varName]: validation });
      }
    }

    return value;
  }

  /**
   * Check if environment variables are set without throwing
   * @param {string[]} vars - Array of variable names to check
   * @returns {Object} Status object with missing variables
   */
  check(vars) {
    const missing = vars.filter(varName => {
      const value = process.env[varName];
      return value === undefined || value === '';
    });

    return {
      valid: missing.length === 0,
      missing,
      set: vars.filter(varName => !missing.includes(varName))
    };
  }

  /**
   * List all environment variables (useful for debugging)
   * @param {boolean} hideValues - Whether to hide values for security
   * @returns {Object} Environment variables
   */
  list(hideValues = true) {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
      env[key] = hideValues ? '[HIDDEN]' : value;
    }
    return env;
  }

  /**
   * Validate type of environment variable value
   * @private
   */
  _validateType(value, expectedType) {
    switch (expectedType.toLowerCase()) {
      case 'string':
        return typeof value === 'string';
      
      case 'number':
        return !isNaN(Number(value)) && isFinite(Number(value));
      
      case 'boolean':
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());
      
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      
      case 'json':
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      
      case 'port':
        const port = Number(value);
        return Number.isInteger(port) && port > 0 && port <= 65535;
      
      default:
        return true; // Unknown types pass through
    }
  }
}

// Create singleton instance
const envKeeper = new EnvKeeper();

// Export both the instance and the class
module.exports = envKeeper;
module.exports.EnvKeeper = EnvKeeper;
module.exports.EnvKeeperError = EnvKeeperError;