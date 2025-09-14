/**
 * Military-Grade Environment Variable Security
 * Secure handling and validation of environment variables
 */

import crypto from 'crypto';

// Environment variable schema with validation rules
interface EnvVarSchema {
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email';
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  sensitive?: boolean; // Mark as sensitive for logging
  default?: any;
}

// Complete schema for all environment variables
export const ENV_SCHEMA: Record<string, EnvVarSchema> = {
  // Node environment
  NODE_ENV: {
    required: true,
    type: 'string',
    pattern: /^(development|test|production)$/,
  },

  // Application URLs
  NEXT_PUBLIC_APP_URL: {
    required: true,
    type: 'url',
    pattern: /^https?:\/\/.+/,
  },
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {
    required: true,
    type: 'string',
    pattern: /^pk_/,
    minLength: 10,
  },

  // Sensitive keys (server-side only)
  CLERK_SECRET_KEY: {
    required: true,
    type: 'string',
    pattern: /^sk_/,
    sensitive: true,
    minLength: 10,
  },
  DATABASE_URL: {
    required: true,
    type: 'url',
    sensitive: true,
    pattern: /^postgresql:\/\/.+/,
  },
  DIRECT_URL: {
    required: false,
    type: 'url',
    sensitive: true,
  },

  // Stripe keys
  STRIPE_SECRET_KEY: {
    required: true,
    type: 'string',
    pattern: /^sk_/,
    sensitive: true,
  },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    required: true,
    type: 'string',
    pattern: /^pk_/,
  },
  STRIPE_WEBHOOK_SECRET: {
    required: true,
    type: 'string',
    sensitive: true,
  },

  // Security settings
  ENCRYPTION_KEY: {
    required: false,
    type: 'string',
    sensitive: true,
    minLength: 32,
    default: crypto.randomBytes(32).toString('hex'),
  },
  JWT_SECRET: {
    required: false,
    type: 'string',
    sensitive: true,
    minLength: 32,
    default: crypto.randomBytes(32).toString('hex'),
  },

  // Optional monitoring
  SENTRY_DSN: {
    required: false,
    type: 'url',
    sensitive: true,
  },
} as const;

// Validated environment cache
let validatedEnv: Record<string, any> | null = null;
const sensitiveKeys = new Set<string>();

/**
 * Validate a single environment variable
 */
function validateEnvVar(key: string, value: string | undefined, schema: EnvVarSchema): {
  isValid: boolean;
  value: any;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if required
  if (schema.required && !value) {
    errors.push(`${key} is required`);
    return { isValid: false, value: undefined, errors };
  }

  // Use default if not provided
  if (!value && schema.default !== undefined) {
    value = schema.default;
  }

  if (!value) {
    return { isValid: true, value: undefined, errors: [] };
  }

  // Type validation
  let processedValue: any = value;

  switch (schema.type) {
    case 'number':
      processedValue = Number(value);
      if (isNaN(processedValue)) {
        errors.push(`${key} must be a valid number`);
      }
      break;

    case 'boolean':
      processedValue = value.toLowerCase() === 'true';
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        errors.push(`${key} must be a valid URL`);
      }
      break;

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${key} must be a valid email`);
      }
      break;
  }

  // Pattern validation
  if (schema.pattern && !schema.pattern.test(value)) {
    errors.push(`${key} format is invalid`);
  }

  // Length validation
  if (schema.minLength && value.length < schema.minLength) {
    errors.push(`${key} must be at least ${schema.minLength} characters`);
  }

  if (schema.maxLength && value.length > schema.maxLength) {
    errors.push(`${key} must be no more than ${schema.maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    value: processedValue,
    errors,
  };
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): {
  isValid: boolean;
  errors: Record<string, string[]>;
  env: Record<string, any>;
} {
  const errors: Record<string, string[]> = {};
  const validatedEnvironment: Record<string, any> = {};

  // Clear sensitive keys set
  sensitiveKeys.clear();

  for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
    const result = validateEnvVar(key, process.env[key], schema);

    if (schema.sensitive) {
      sensitiveKeys.add(key);
    }

    if (!result.isValid) {
      errors[key] = result.errors;
    } else {
      validatedEnvironment[key] = result.value;
    }
  }

  // Additional security checks
  if (process.env.NODE_ENV === 'production') {
    // Ensure all sensitive keys are present in production
    const missingSensitive = Array.from(sensitiveKeys).filter(
      key => ENV_SCHEMA[key].required && !validatedEnvironment[key]
    );

    if (missingSensitive.length > 0) {
      errors.PRODUCTION_SECURITY = [
        `Missing sensitive environment variables in production: ${missingSensitive.join(', ')}`
      ];
    }

    // Check for development/test values in production
    const dangerousPatterns = [
      /test/i,
      /dev/i,
      /localhost/i,
      /127\.0\.0\.1/,
      /example\.com/i,
    ];

    for (const [key, value] of Object.entries(validatedEnvironment)) {
      if (typeof value === 'string' && !sensitiveKeys.has(key)) {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            if (!errors.PRODUCTION_SECURITY) {
              errors.PRODUCTION_SECURITY = [];
            }
            errors.PRODUCTION_SECURITY.push(
              `${key} appears to contain development/test values in production`
            );
            break;
          }
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    env: validatedEnvironment,
  };
}

/**
 * Get validated environment variables
 */
export function getValidatedEnv(): Record<string, any> {
  if (!validatedEnv) {
    const result = validateEnvironment();

    if (!result.isValid) {
      console.error('Environment validation failed:', result.errors);

      // In production, fail hard
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Critical environment variables missing or invalid');
      }

      // In development, warn but continue
      console.warn('Continuing with invalid environment (development mode)');
    }

    validatedEnv = result.env;
  }

  return validatedEnv;
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnv<T = string>(key: keyof typeof ENV_SCHEMA): T {
  const env = getValidatedEnv();
  return env[key] as T;
}

/**
 * Check if a key is marked as sensitive
 */
export function isSensitiveKey(key: string): boolean {
  return sensitiveKeys.has(key);
}

/**
 * Safely log environment variables (redact sensitive ones)
 */
export function logEnvironment(): void {
  const env = getValidatedEnv();
  const safeEnv: Record<string, any> = {};

  for (const [key, value] of Object.entries(env)) {
    if (sensitiveKeys.has(key)) {
      safeEnv[key] = value ? '[REDACTED]' : undefined;
    } else {
      safeEnv[key] = value;
    }
  }

  console.log('Environment Configuration:', JSON.stringify(safeEnv, null, 2));
}

/**
 * Generate secure random values for missing optional keys
 */
export function generateSecureDefaults(): void {
  const env = process.env;

  if (!env.ENCRYPTION_KEY) {
    env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    console.log('Generated ENCRYPTION_KEY');
  }

  if (!env.JWT_SECRET) {
    env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.log('Generated JWT_SECRET');
  }
}

/**
 * Initialize environment validation on import
 */
export function initializeEnvironment(): void {
  try {
    // Generate secure defaults for missing optional keys
    generateSecureDefaults();

    // Validate environment
    const result = validateEnvironment();

    if (!result.isValid) {
      console.error('🔥 ENVIRONMENT VALIDATION FAILED:');

      for (const [key, errors] of Object.entries(result.errors)) {
        console.error(`  ${key}:`);
        for (const error of errors) {
          console.error(`    - ${error}`);
        }
      }

      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else {
      console.log('✅ Environment validation passed');

      if (process.env.NODE_ENV !== 'production') {
        logEnvironment();
      }
    }

    validatedEnv = result.env;
  } catch (error) {
    console.error('Failed to initialize environment:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Auto-initialize when imported
if (typeof window === 'undefined') {
  initializeEnvironment();
}