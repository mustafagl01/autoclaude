/**
 * Authentication Utilities
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Provides password hashing and verification functions using bcrypt.
 * All passwords are hashed with a cost factor of 12 for security.
 */

import * as bcrypt from 'bcrypt';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result of a password hashing operation
 */
export interface HashResult {
  success: boolean;
  hash?: string;
  error?: string;
}

/**
 * Result of a password verification operation
 */
export interface VerifyResult {
  success: boolean;
  valid?: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * bcrypt cost factor (number of rounds)
 * Higher values are more secure but slower. 12 is a good balance for security and performance.
 * Each increment doubles the time required to hash.
 */
const BCRYPT_COST_FACTOR = 12;

// ============================================================================
// Password Hashing & Verification
// ============================================================================

/**
 * Hash a plain text password using bcrypt
 *
 * @param password - Plain text password to hash
 * @returns Hashed password or error
 *
 * @example
 * const result = await hashPassword('mySecurePassword123');
 * if (result.success && result.hash) {
 *   // Store result.hash in database
 *   await createUser(db, { email, password_hash: result.hash, ... });
 * }
 */
export async function hashPassword(password: string): Promise<HashResult> {
  try {
    // Validate input
    if (!password || typeof password !== 'string') {
      return {
        success: false,
        error: 'Password must be a non-empty string',
      };
    }

    // Check minimum password length
    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long',
      };
    }

    // Hash the password with bcrypt
    const hash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

    return {
      success: true,
      hash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while hashing password',
    };
  }
}

/**
 * Verify a plain text password against a bcrypt hash
 *
 * @param password - Plain text password to verify
 * @param hash - Stored bcrypt hash to compare against
 * @returns Verification result or error
 *
 * @example
 * const user = await getUserByEmail(db, 'user@example.com');
 * if (user?.password_hash) {
 *   const result = await verifyPassword('inputPassword', user.password_hash);
 *   if (result.success && result.valid) {
 *     // Password is correct, authenticate user
 *   }
 * }
 */
export async function verifyPassword(password: string, hash: string): Promise<VerifyResult> {
  try {
    // Validate inputs
    if (!password || typeof password !== 'string') {
      return {
        success: false,
        error: 'Password must be a non-empty string',
      };
    }

    if (!hash || typeof hash !== 'string') {
      return {
        success: false,
        error: 'Hash must be a non-empty string',
      };
    }

    // Compare password with hash
    const isValid = await bcrypt.compare(password, hash);

    return {
      success: true,
      valid: isValid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while verifying password',
    };
  }
}

/**
 * Check if a password needs to be rehashed (e.g., when increasing cost factor)
 *
 * @param hash - Existing bcrypt hash
 * @returns true if the hash should be updated with a new cost factor
 *
 * @example
 * const user = await getUserByEmail(db, 'user@example.com');
 * if (user?.password_hash && needsRehash(user.password_hash)) {
 *   // Rehash password with current cost factor
 *   const newHash = await hashPassword(newPassword);
 *   if (newHash.success && newHash.hash) {
 *     await updateUser(db, user.id, { password_hash: newHash.hash });
 *   }
 * }
 */
export function needsRehash(hash: string): boolean {
  try {
    // Extract cost factor from hash (bcrypt hashes start with $2a$, $2b$, or $2y$)
    // Format: $2a$[cost]$[salt][hash]
    const match = hash.match(/^\$2[aby]\$(\d+)\$/);
    if (!match) {
      return false; // Invalid hash format, don't rehash
    }

    const currentCost = parseInt(match[1], 10);
    return currentCost < BCRYPT_COST_FACTOR;
  } catch {
    return false;
  }
}

/**
 * Validate password strength before hashing
 *
 * @param password - Plain text password to validate
 * @returns Object with validation result and error message if invalid
 *
 * Password requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 *
 * @example
 * const validation = validatePasswordStrength('MyP@ssw0rd');
 * if (!validation.valid) {
 *   return res.status(400).json({ error: validation.error });
 * }
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      error: 'Password is required',
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'Password must not exceed 128 characters',
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
    };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character',
    };
  }

  return {
    valid: true,
  };
}
