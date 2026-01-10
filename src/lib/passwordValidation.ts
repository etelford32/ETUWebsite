/**
 * Password validation utilities
 *
 * Enforces strong password requirements to protect user accounts
 */

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0-100, strength score
  errors: string[];
  suggestions: string[];
}

// Common passwords to reject (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', '123456789', '12345',
  'qwerty', 'abc123', 'password1', '1234567', 'welcome', 'monkey',
  'qwerty123', '1234567890', 'iloveyou', 'admin', 'letmein', 'master',
  'sunshine', 'princess', 'football', 'charlie', 'login', 'starwars'
]);

// Weak patterns to detect
const WEAK_PATTERNS = [
  { pattern: /^(.)\1+$/, message: 'Password cannot be all the same character' },
  { pattern: /^(012|123|234|345|456|567|678|789|890)+/, message: 'Password contains sequential numbers' },
  { pattern: /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, message: 'Password contains sequential letters' },
  { pattern: /^(qwerty|asdfgh|zxcvbn)/i, message: 'Password contains keyboard pattern' },
];

/**
 * Validate password strength and requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length < 12) {
    suggestions.push('Consider using at least 12 characters for better security');
    score += 20;
  } else {
    score += 30;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  } else {
    score += 15;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  } else {
    score += 15;
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  } else {
    score += 15;
  }

  // Check for special characters
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  } else {
    score += 15;
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common and easily guessable');
    score = Math.min(score, 20);
  }

  // Check for weak patterns
  for (const { pattern, message } of WEAK_PATTERNS) {
    if (pattern.test(password)) {
      errors.push(message);
      score = Math.min(score, 30);
    }
  }

  // Check for repeated sequences
  if (/(.{3,})\1/.test(password)) {
    suggestions.push('Avoid repeating sequences in your password');
    score = Math.min(score, 70);
  }

  // Bonus points for length
  if (password.length >= 16) {
    score += 10;
  }

  // Check for character variety
  const uniqueChars = new Set(password).size;
  const variety = uniqueChars / password.length;
  if (variety < 0.5) {
    suggestions.push('Use a wider variety of characters');
    score = Math.min(score, 70);
  } else {
    score += 10;
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // If there are errors, score should be lower
  if (errors.length > 0) {
    score = Math.min(score, 40);
  }

  return {
    valid: errors.length === 0,
    score,
    errors,
    suggestions: errors.length === 0 ? suggestions : []
  };
}

/**
 * Get password strength label
 */
export function getPasswordStrength(score: number): string {
  if (score < 40) return 'Weak';
  if (score < 60) return 'Fair';
  if (score < 80) return 'Good';
  return 'Strong';
}

/**
 * Get password strength color (for UI)
 */
export function getPasswordStrengthColor(score: number): string {
  if (score < 40) return '#ef4444'; // red
  if (score < 60) return '#f59e0b'; // orange
  if (score < 80) return '#eab308'; // yellow
  return '#22c55e'; // green
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = lowercase + uppercase + numbers + special;

  let password = '';

  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password to randomize position of required characters
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if password has been compromised in known breaches
 * This is a placeholder - in production, integrate with haveibeenpwned.com API
 */
export async function checkPasswordBreach(password: string): Promise<boolean> {
  // TODO: Implement HIBP API integration
  // For now, just check against our common passwords list
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Validate password match (for confirmation fields)
 */
export function validatePasswordMatch(
  password: string,
  confirmation: string
): { valid: boolean; error?: string } {
  if (password !== confirmation) {
    return {
      valid: false,
      error: 'Passwords do not match'
    };
  }

  return { valid: true };
}
