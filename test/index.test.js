const envGuard = require('../index');
const { EnvGuard, EnvGuardError } = require('../index');

describe('env-guard', () => {
  beforeEach(() => {
    // Clean up environment
    delete process.env.TEST_VAR;
    delete process.env.TEST_PORT;
    delete process.env.TEST_URL;
    delete process.env.TEST_EMAIL;
  });

  describe('require()', () => {
    test('should pass when all variables are set', () => {
      process.env.TEST_VAR = 'test-value';
      expect(() => envGuard.require(['TEST_VAR'])).not.toThrow();
    });

    test('should throw when variables are missing', () => {
      expect(() => envGuard.require(['MISSING_VAR'])).toThrow(EnvGuardError);
    });

    test('should throw with descriptive message', () => {
      try {
        envGuard.require(['VAR1', 'VAR2']);
      } catch (error) {
        expect(error.message).toContain('Missing required environment variables: VAR1, VAR2');
        expect(error.missing).toEqual(['VAR1', 'VAR2']);
      }
    });

    test('should treat empty string as missing', () => {
      process.env.EMPTY_VAR = '';
      expect(() => envGuard.require(['EMPTY_VAR'])).toThrow(EnvGuardError);
    });
  });

  describe('validate()', () => {
    test('should validate string type', () => {
      process.env.TEST_VAR = 'hello';
      expect(() => envGuard.validate({ TEST_VAR: 'string' })).not.toThrow();
    });

    test('should validate number type', () => {
      process.env.TEST_PORT = '3000';
      expect(() => envGuard.validate({ TEST_PORT: 'number' })).not.toThrow();
    });

    test('should fail invalid number', () => {
      process.env.TEST_PORT = 'not-a-number';
      expect(() => envGuard.validate({ TEST_PORT: 'number' })).toThrow(EnvGuardError);
    });

    test('should validate URL type', () => {
      process.env.TEST_URL = 'https://example.com';
      expect(() => envGuard.validate({ TEST_URL: 'url' })).not.toThrow();
    });

    test('should fail invalid URL', () => {
      process.env.TEST_URL = 'not-a-url';
      expect(() => envGuard.validate({ TEST_URL: 'url' })).toThrow(EnvGuardError);
    });

    test('should validate email type', () => {
      process.env.TEST_EMAIL = 'test@example.com';
      expect(() => envGuard.validate({ TEST_EMAIL: 'email' })).not.toThrow();
    });

    test('should validate with object rules', () => {
      process.env.API_KEY = '1234567890abc';
      expect(() => envGuard.validate({
        API_KEY: { type: 'string', minLength: 10 }
      })).not.toThrow();
    });

    test('should fail minLength validation', () => {
      process.env.API_KEY = '123';
      expect(() => envGuard.validate({
        API_KEY: { type: 'string', minLength: 10 }
      })).toThrow(EnvGuardError);
    });

    test('should validate enum values', () => {
      process.env.NODE_ENV = 'production';
      expect(() => envGuard.validate({
        NODE_ENV: { enum: ['development', 'production', 'test'] }
      })).not.toThrow();
    });
  });

  describe('get()', () => {
    test('should return environment variable value', () => {
      process.env.TEST_VAR = 'test-value';
      expect(envGuard.get('TEST_VAR')).toBe('test-value');
    });

    test('should return default value when variable is missing', () => {
      expect(envGuard.get('MISSING_VAR', 'default')).toBe('default');
    });

    test('should throw when variable is missing and no default', () => {
      expect(() => envGuard.get('MISSING_VAR')).toThrow(EnvGuardError);
    });
  });

  describe('check()', () => {
    test('should return status object', () => {
      process.env.SET_VAR = 'value';
      const result = envGuard.check(['SET_VAR', 'MISSING_VAR']);
      
      expect(result).toEqual({
        valid: false,
        missing: ['MISSING_VAR'],
        set: ['SET_VAR']
      });
    });
  });

  describe('list()', () => {
    test('should return environment variables with hidden values', () => {
      process.env.TEST_VAR = 'secret';
      const env = envGuard.list();
      expect(env.TEST_VAR).toBe('[HIDDEN]');
    });

    test('should return actual values when hideValues is false', () => {
      process.env.TEST_VAR = 'secret';
      const env = envGuard.list(false);
      expect(env.TEST_VAR).toBe('secret');
    });
  });

  describe('EnvGuard class', () => {
    test('should be able to create new instances', () => {
      const guard = new EnvGuard();
      expect(guard).toBeInstanceOf(EnvGuard);
    });
  });
});