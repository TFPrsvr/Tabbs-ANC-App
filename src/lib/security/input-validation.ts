/**
 * Military-Grade Input Validation and Sanitization
 * Comprehensive protection against all forms of input-based attacks
 */

import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

// Validation schemas for different input types
export const VALIDATION_RULES = {
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254,
    required: true,
  },
  password: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    required: true,
  },
  username: {
    pattern: /^[a-zA-Z0-9_-]{3,30}$/,
    minLength: 3,
    maxLength: 30,
    required: true,
  },
  filename: {
    pattern: /^[a-zA-Z0-9_.-]+$/,
    maxLength: 255,
    blacklist: ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|'],
  },
  audioTitle: {
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  },
  audioDescription: {
    maxLength: 1000,
    allowHtml: false,
  },
  url: {
    protocols: ['http', 'https'],
    maxLength: 2048,
  },
  json: {
    maxSize: 1024 * 1024, // 1MB
  },
} as const;

// File type validation
export const ALLOWED_FILE_TYPES = {
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/mp4',
    'audio/webm',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/quicktime',
  ],
  image: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ],
  document: [
    'application/pdf',
    'text/plain',
    'application/json',
  ],
} as const;

export const MAX_FILE_SIZES = {
  audio: 100 * 1024 * 1024, // 100MB
  video: 500 * 1024 * 1024, // 500MB
  image: 10 * 1024 * 1024,  // 10MB
  document: 50 * 1024 * 1024, // 50MB
} as const;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

/**
 * Comprehensive string sanitization
 */
export function sanitizeString(
  input: string,
  options: {
    allowHtml?: boolean;
    maxLength?: number;
    removeEmoji?: boolean;
    trimWhitespace?: boolean;
  } = {}
): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input;

  // Trim whitespace by default
  if (options.trimWhitespace !== false) {
    sanitized = sanitized.trim();
  }

  // Remove or escape HTML
  if (options.allowHtml) {
    sanitized = DOMPurify.sanitize(sanitized);
  } else {
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Remove emoji if specified
  if (options.removeEmoji) {
    sanitized = sanitized.replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu,
      ''
    );
  }

  // Truncate to max length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  const sanitizedEmail = sanitizeString(email, { maxLength: VALIDATION_RULES.email.maxLength });

  if (!validator.isEmail(sanitizedEmail)) {
    errors.push('Invalid email format');
  }

  if (sanitizedEmail.length > VALIDATION_RULES.email.maxLength) {
    errors.push(`Email must be less than ${VALIDATION_RULES.email.maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedEmail.toLowerCase(),
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < VALIDATION_RULES.password.minLength) {
    errors.push(`Password must be at least ${VALIDATION_RULES.password.minLength} characters`);
  }

  if (password.length > VALIDATION_RULES.password.maxLength) {
    errors.push(`Password must be less than ${VALIDATION_RULES.password.maxLength} characters`);
  }

  if (!VALIDATION_RULES.password.pattern.test(password)) {
    errors.push('Password must contain uppercase, lowercase, number, and special character');
  }

  // Check against common passwords
  const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: password, // Don't sanitize passwords
  };
}

/**
 * Validate filename
 */
export function validateFilename(filename: string): ValidationResult {
  const errors: string[] = [];

  if (!filename) {
    errors.push('Filename is required');
    return { isValid: false, errors };
  }

  const sanitizedFilename = sanitizeString(filename, {
    maxLength: VALIDATION_RULES.filename.maxLength,
    allowHtml: false
  });

  if (!VALIDATION_RULES.filename.pattern.test(sanitizedFilename)) {
    errors.push('Filename contains invalid characters');
  }

  // Check for blacklisted patterns
  for (const blacklisted of VALIDATION_RULES.filename.blacklist) {
    if (sanitizedFilename.includes(blacklisted)) {
      errors.push('Filename contains forbidden patterns');
      break;
    }
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const baseFilename = sanitizedFilename.split('.')[0].toUpperCase();
  if (reservedNames.includes(baseFilename)) {
    errors.push('Filename uses reserved system name');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedFilename,
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: { name: string; type: string; size: number },
  category: keyof typeof ALLOWED_FILE_TYPES
): ValidationResult {
  const errors: string[] = [];

  // Validate filename
  const filenameResult = validateFilename(file.name);
  if (!filenameResult.isValid) {
    errors.push(...filenameResult.errors);
  }

  // Validate file type
  if (!(ALLOWED_FILE_TYPES[category] as unknown as string[]).includes(file.type)) {
    errors.push(`File type ${file.type} not allowed for ${category}`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZES[category]) {
    errors.push(`File size exceeds limit of ${MAX_FILE_SIZES[category] / (1024 * 1024)}MB`);
  }

  // Additional security checks
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (suspiciousExtensions.includes(extension)) {
    errors.push('File extension not allowed for security reasons');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: {
      name: filenameResult.sanitizedValue,
      type: file.type,
      size: file.size,
    },
  };
}

/**
 * Validate JSON input
 */
export function validateJSON(jsonString: string): ValidationResult {
  const errors: string[] = [];

  if (!jsonString) {
    errors.push('JSON is required');
    return { isValid: false, errors };
  }

  if (jsonString.length > VALIDATION_RULES.json.maxSize) {
    errors.push('JSON payload too large');
    return { isValid: false, errors };
  }

  try {
    const parsed = JSON.parse(jsonString);

    // Check for dangerous properties
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    const checkForDangerousKeys = (obj: any): boolean => {
      if (typeof obj !== 'object' || obj === null) return false;

      for (const key in obj) {
        if (dangerousKeys.includes(key)) return true;
        if (typeof obj[key] === 'object' && checkForDangerousKeys(obj[key])) return true;
      }
      return false;
    };

    if (checkForDangerousKeys(parsed)) {
      errors.push('JSON contains dangerous properties');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: parsed,
    };
  } catch (error) {
    errors.push('Invalid JSON format');
    return { isValid: false, errors };
  }
}

/**
 * Validate URL
 */
export function validateURL(url: string): ValidationResult {
  const errors: string[] = [];

  if (!url) {
    errors.push('URL is required');
    return { isValid: false, errors };
  }

  const sanitizedUrl = sanitizeString(url, { maxLength: VALIDATION_RULES.url.maxLength });

  if (!validator.isURL(sanitizedUrl, {
    protocols: VALIDATION_RULES.url.protocols as unknown as string[],
    require_protocol: true,
    require_valid_protocol: true,
  })) {
    errors.push('Invalid URL format');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
    /ftp:/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitizedUrl)) {
      errors.push('URL contains potentially dangerous protocol');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedUrl,
  };
}

/**
 * Generic input validator
 */
export function validateInput(
  value: any,
  validationType: keyof typeof VALIDATION_RULES,
  customRules?: any
): ValidationResult {
  switch (validationType) {
    case 'email':
      return validateEmail(value);
    case 'password':
      return validatePassword(value);
    case 'filename':
      return validateFilename(value);
    case 'url':
      return validateURL(value);
    default:
      return { isValid: true, errors: [], sanitizedValue: value };
  }
}

/**
 * Batch validate multiple inputs
 */
export function validateBatch(inputs: Array<{
  value: any;
  type: keyof typeof VALIDATION_RULES;
  field: string;
}>): {
  isValid: boolean;
  errors: Record<string, string[]>;
  sanitizedValues: Record<string, any>;
} {
  const errors: Record<string, string[]> = {};
  const sanitizedValues: Record<string, any> = {};

  for (const input of inputs) {
    const result = validateInput(input.value, input.type);

    if (!result.isValid) {
      errors[input.field] = result.errors;
    } else {
      sanitizedValues[input.field] = result.sanitizedValue;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedValues,
  };
}