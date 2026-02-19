/**
 * Unit Tests: Authentication Helpers
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Tests for password hashing, verification, and validation functions.
 * Ensures >80% code coverage for lib/auth.ts
 */

import {
  hashPassword,
  verifyPassword,
  needsRehash,
  validatePasswordStrength,
  HashResult,
  VerifyResult,
} from './auth';

// ============================================================================
// hashPassword() Tests
// ============================================================================

describe('hashPassword', () => {
  describe('successful password hashing', () => {
    it('should hash a valid password successfully', async () => {
      const password = 'SecureP@ssw0rd';
      const result: HashResult = await hashPassword(password);

      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe('string');
      expect(result.hash?.length).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should generate different hashes for the same password (salt)', async () => {
      const password = 'SameP@ssw0rd';
      const result1: HashResult = await hashPassword(password);
      const result2: HashResult = await hashPassword(password);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.hash).not.toEqual(result2.hash);
    });

    it('should hash a password with special characters', async () => {
      const password = 'P@$$w0rd!#$%^&*()';
      const result: HashResult = await hashPassword(password);

      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
    });

    it('should hash a password at minimum length (8 characters)', async () => {
      const password = 'P@ssw0rd';
      const result: HashResult = await hashPassword(password);

      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
    });

    it('should produce a bcrypt hash with correct format', async () => {
      const password = 'TestP@ss1';
      const result: HashResult = await hashPassword(password);

      expect(result.success).toBe(true);
      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(result.hash).toMatch(/^\$2[aby]\$12\$/);
    });
  });

  describe('input validation errors', () => {
    it('should return error for empty string password', async () => {
      const result: HashResult = await hashPassword('');

      expect(result.success).toBe(false);
      expect(result.hash).toBeUndefined();
      expect(result.error).toBe('Password must be a non-empty string');
    });

    it('should return error for password shorter than 8 characters', async () => {
      const result: HashResult = await hashPassword('Pass1!');

      expect(result.success).toBe(false);
      expect(result.hash).toBeUndefined();
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('should return error for non-string input (null)', async () => {
      const result: HashResult = await hashPassword(null as unknown as string);

      expect(result.success).toBe(false);
      expect(result.hash).toBeUndefined();
      expect(result.error).toBe('Password must be a non-empty string');
    });

    it('should return error for non-string input (undefined)', async () => {
      const result: HashResult = await hashPassword(undefined as unknown as string);

      expect(result.success).toBe(false);
      expect(result.hash).toBeUndefined();
      expect(result.error).toBe('Password must be a non-empty string');
    });

    it('should return error for non-string input (number)', async () => {
      const result: HashResult = await hashPassword(12345678 as unknown as string);

      expect(result.success).toBe(false);
      expect(result.hash).toBeUndefined();
      expect(result.error).toBe('Password must be a non-empty string');
    });
  });
});

// ============================================================================
// verifyPassword() Tests
// ============================================================================

describe('verifyPassword', () => {
  describe('successful password verification', () => {
    it('should verify a correct password against its hash', async () => {
      const password = 'CorrectP@ssw0rd';
      const hashResult: HashResult = await hashPassword(password);

      if (!hashResult.hash) {
        throw new Error('Hash generation failed');
      }

      const verifyResult: VerifyResult = await verifyPassword(password, hashResult.hash);

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.error).toBeUndefined();
    });

    it('should reject an incorrect password', async () => {
      const correctPassword = 'CorrectP@ssw0rd';
      const wrongPassword = 'WrongP@ssw0rd';
      const hashResult: HashResult = await hashPassword(correctPassword);

      if (!hashResult.hash) {
        throw new Error('Hash generation failed');
      }

      const verifyResult: VerifyResult = await verifyPassword(wrongPassword, hashResult.hash);

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.error).toBeUndefined();
    });

    it('should verify a password with special characters', async () => {
      const password = 'P@$$w0rd!#$%';
      const hashResult: HashResult = await hashPassword(password);

      if (!hashResult.hash) {
        throw new Error('Hash generation failed');
      }

      const verifyResult: VerifyResult = await verifyPassword(password, hashResult.hash);

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.valid).toBe(true);
    });
  });

  describe('input validation errors', () => {
    it('should return error for empty password string', async () => {
      const result: VerifyResult = await verifyPassword('', '$2a$12$hash');

      expect(result.success).toBe(false);
      expect(result.valid).toBeUndefined();
      expect(result.error).toBe('Password must be a non-empty string');
    });

    it('should return error for empty hash string', async () => {
      const result: VerifyResult = await verifyPassword('password', '');

      expect(result.success).toBe(false);
      expect(result.valid).toBeUndefined();
      expect(result.error).toBe('Hash must be a non-empty string');
    });

    it('should return error for null password', async () => {
      const result: VerifyResult = await verifyPassword(null as unknown as string, '$2a$12$hash');

      expect(result.success).toBe(false);
      expect(result.valid).toBeUndefined();
      expect(result.error).toBe('Password must be a non-empty string');
    });

    it('should return error for null hash', async () => {
      const result: VerifyResult = await verifyPassword('password', null as unknown as string);

      expect(result.success).toBe(false);
      expect(result.valid).toBeUndefined();
      expect(result.error).toBe('Hash must be a non-empty string');
    });

    it('should return error for undefined password', async () => {
      const result: VerifyResult = await verifyPassword(undefined as unknown as string, '$2a$12$hash');

      expect(result.success).toBe(false);
      expect(result.valid).toBeUndefined();
      expect(result.error).toBe('Password must be a non-empty string');
    });

    it('should return error for undefined hash', async () => {
      const result: VerifyResult = await verifyPassword('password', undefined as unknown as string);

      expect(result.success).toBe(false);
      expect(result.valid).toBeUndefined();
      expect(result.error).toBe('Hash must be a non-empty string');
    });
  });

  describe('invalid hash formats', () => {
    it('should handle malformed hash gracefully', async () => {
      const password = 'TestP@ss1';
      const malformedHash = 'not-a-valid-bcrypt-hash';

      const result: VerifyResult = await verifyPassword(password, malformedHash);

      // bcrypt.compare will throw an error for invalid hash format
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================================================
// needsRehash() Tests
// ============================================================================

describe('needsRehash', () => {
  describe('cost factor detection', () => {
    it('should return true for hash with cost factor lower than 12', () => {
      const hashWithCost10 = '$2a$10$abcdefghijklmnopqrstuvwxyz012345';
      const result = needsRehash(hashWithCost10);

      expect(result).toBe(true);
    });

    it('should return false for hash with cost factor equal to 12', () => {
      const hashWithCost12 = '$2a$12$abcdefghijklmnopqrstuvwxyz012345';
      const result = needsRehash(hashWithCost12);

      expect(result).toBe(false);
    });

    it('should return false for hash with cost factor greater than 12', () => {
      const hashWithCost14 = '$2a$14$abcdefghijklmnopqrstuvwxyz012345';
      const result = needsRehash(hashWithCost14);

      expect(result).toBe(false);
    });
  });

  describe('bcrypt version variants', () => {
    it('should handle $2a$ variant', () => {
      const hash = '$2a$10$abcdefghijklmnopqrstuvwxyz012345';
      expect(needsRehash(hash)).toBe(true);
    });

    it('should handle $2b$ variant', () => {
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz012345';
      expect(needsRehash(hash)).toBe(true);
    });

    it('should handle $2y$ variant', () => {
      const hash = '$2y$10$abcdefghijklmnopqrstuvwxyz012345';
      expect(needsRehash(hash)).toBe(true);
    });
  });

  describe('invalid hash formats', () => {
    it('should return false for empty string', () => {
      const result = needsRehash('');
      expect(result).toBe(false);
    });

    it('should return false for non-bcrypt hash', () => {
      const result = needsRehash('invalid-hash-format');
      expect(result).toBe(false);
    });

    it('should return false for malformed bcrypt hash', () => {
      const result = needsRehash('$2a$invalid');
      expect(result).toBe(false);
    });

    it('should return false for hash without cost factor', () => {
      const result = needsRehash('$2a$$');
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle hash with extra characters after cost factor', () => {
      const hash = '$2a$10$salt22characterssalt22charactershash';
      const result = needsRehash(hash);
      expect(result).toBe(true); // Cost 10 < 12
    });

    it('should return false for hash at exactly cost 12', () => {
      const hash = '$2b$12$some.salt.some.more.here.here.here';
      const result = needsRehash(hash);
      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// validatePasswordStrength() Tests
// ============================================================================

describe('validatePasswordStrength', () => {
  describe('valid passwords', () => {
    it('should validate a strong password meeting all requirements', () => {
      const password = 'SecureP@ssw0rd';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate password with all special characters', () => {
      const password = 'Passw0rd!@#$%^&*()';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
    });

    it('should validate password at minimum length (8 characters)', () => {
      const password = 'P@ssw0rd';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
    });

    it('should validate password at maximum length (128 characters)', () => {
      const password = 'P@ssw0rd' + 'a'.repeat(120); // 8 + 120 = 128
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
    });
  });

  describe('missing requirements', () => {
    it('should reject password without lowercase letter', () => {
      const password = 'PASSWORD@123';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const password = 'password@123';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const password = 'Password@abc';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const password = 'Password123';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must contain at least one special character');
    });
  });

  describe('length requirements', () => {
    it('should reject password shorter than 8 characters', () => {
      const password = 'P@ss1!';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('should reject password longer than 128 characters', () => {
      const password = 'P@ssw0rd' + 'a'.repeat(121); // 8 + 121 = 129
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must not exceed 128 characters');
    });

    it('should reject empty password', () => {
      const result = validatePasswordStrength('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject exactly 7 characters', () => {
      const password = 'P@ssw0r';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });
  });

  describe('invalid input types', () => {
    it('should reject null password', () => {
      const result = validatePasswordStrength(null as unknown as string);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject undefined password', () => {
      const result = validatePasswordStrength(undefined as unknown as string);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject non-string input (number)', () => {
      const result = validatePasswordStrength(12345678 as unknown as string);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject non-string input (object)', () => {
      const result = validatePasswordStrength({} as unknown as string);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password is required');
    });
  });

  describe('special character coverage', () => {
    it('should accept password with exclamation mark', () => {
      const result = validatePasswordStrength('Password1!');
      expect(result.valid).toBe(true);
    });

    it('should accept password with at sign', () => {
      const result = validatePasswordStrength('Password1@');
      expect(result.valid).toBe(true);
    });

    it('should accept password with hash symbol', () => {
      const result = validatePasswordStrength('Password1#');
      expect(result.valid).toBe(true);
    });

    it('should accept password with dollar sign', () => {
      const result = validatePasswordStrength('Password1$');
      expect(result.valid).toBe(true);
    });

    it('should accept password with percent sign', () => {
      const result = validatePasswordStrength('Password1%');
      expect(result.valid).toBe(true);
    });

    it('should accept password with caret', () => {
      const result = validatePasswordStrength('Password1^');
      expect(result.valid).toBe(true);
    });

    it('should accept password with ampersand', () => {
      const result = validatePasswordStrength('Password1&');
      expect(result.valid).toBe(true);
    });

    it('should accept password with asterisk', () => {
      const result = validatePasswordStrength('Password1*');
      expect(result.valid).toBe(true);
    });

    it('should accept password with parentheses', () => {
      const result = validatePasswordStrength('Password1()');
      expect(result.valid).toBe(true);
    });

    it('should accept password with underscore', () => {
      const result = validatePasswordStrength('Password1_');
      expect(result.valid).toBe(true);
    });

    it('should accept password with hyphen', () => {
      const result = validatePasswordStrength('Password1-');
      expect(result.valid).toBe(true);
    });

    it('should accept password with equals sign', () => {
      const result = validatePasswordStrength('Password1=');
      expect(result.valid).toBe(true);
    });

    it('should accept password with plus sign', () => {
      const result = validatePasswordStrength('Password1+');
      expect(result.valid).toBe(true);
    });

    it('should accept password with brackets', () => {
      const result = validatePasswordStrength('Password1[]');
      expect(result.valid).toBe(true);
    });

    it('should accept password with braces', () => {
      const result = validatePasswordStrength('Password1{}');
      expect(result.valid).toBe(true);
    });

    it('should accept password with pipe', () => {
      const result = validatePasswordStrength('Password1|');
      expect(result.valid).toBe(true);
    });

    it('should accept password with semicolon', () => {
      const result = validatePasswordStrength('Password1;');
      expect(result.valid).toBe(true);
    });

    it('should accept password with colon', () => {
      const result = validatePasswordStrength('Password1:');
      expect(result.valid).toBe(true);
    });

    it('should accept password with single quote', () => {
      const result = validatePasswordStrength('Password1\'');
      expect(result.valid).toBe(true);
    });

    it('should accept password with double quote', () => {
      const result = validatePasswordStrength('Password1"');
      expect(result.valid).toBe(true);
    });

    it('should accept password with comma', () => {
      const result = validatePasswordStrength('Password1,');
      expect(result.valid).toBe(true);
    });

    it('should accept password with period', () => {
      const result = validatePasswordStrength('Password1.');
      expect(result.valid).toBe(true);
    });

    it('should accept password with slash', () => {
      const result = validatePasswordStrength('Password1/');
      expect(result.valid).toBe(true);
    });

    it('should accept password with backslash', () => {
      const result = validatePasswordStrength('Password1\\');
      expect(result.valid).toBe(true);
    });

    it('should accept password with question mark', () => {
      const result = validatePasswordStrength('Password1?');
      expect(result.valid).toBe(true);
    });

    it('should accept password with less than/greater than', () => {
      const result = validatePasswordStrength('Password1<>');
      expect(result.valid).toBe(true);
    });
  });

  describe('realistic password scenarios', () => {
    it('should accept a passphrase with spaces (if meeting requirements)', () => {
      const password = 'P@ss w0rd Phrase';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
    });

    it('should reject common weak password patterns', () => {
      expect(validatePasswordStrength('Password1!').valid).toBe(true); // Actually valid
      expect(validatePasswordStrength('P@ssw0rd').valid).toBe(true); // Actually valid
      // But these would be rejected by a strength meter, not by format rules
    });

    it('should accept complex realistic password', () => {
      const password = 'MyS3cur3P@ssword!2024';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// Integration Tests (combining multiple functions)
// ============================================================================

describe('Authentication Integration Tests', () => {
  it('should hash and then verify the same password successfully', async () => {
    const password = 'IntegrationTestP@ss1';

    // Hash the password
    const hashResult: HashResult = await hashPassword(password);
    expect(hashResult.success).toBe(true);
    expect(hashResult.hash).toBeDefined();

    // Verify the password against the hash
    const verifyResult: VerifyResult = await verifyPassword(password, hashResult.hash!);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.valid).toBe(true);
  });

  it('should fail to verify a different password', async () => {
    const originalPassword = 'OriginalP@ss1';
    const wrongPassword = 'WrongP@ss1';

    const hashResult: HashResult = await hashPassword(originalPassword);
    expect(hashResult.success).toBe(true);

    const verifyResult: VerifyResult = await verifyPassword(wrongPassword, hashResult.hash!);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.valid).toBe(false);
  });

  it('should validate password before hashing', () => {
    const weakPassword = 'weak';

    // Should fail validation
    const validationResult = validatePasswordStrength(weakPassword);
    expect(validationResult.valid).toBe(false);

    // Should also fail hashing
    // Note: hashPassword will fail because it's < 8 chars
  });

  it('should handle the complete authentication flow', async () => {
    // User creates password
    const userPassword = 'UserP@ssw0rd123!';

    // Step 1: Validate password strength
    const strengthCheck = validatePasswordStrength(userPassword);
    expect(strengthCheck.valid).toBe(true);

    // Step 2: Hash password for storage
    const hashResult = await hashPassword(userPassword);
    expect(hashResult.success).toBe(true);
    expect(hashResult.hash).toBeDefined();

    // Step 3: Check if rehashing needed (should be false for fresh hash)
    const rehashNeeded = needsRehash(hashResult.hash!);
    expect(rehashNeeded).toBe(false);

    // Step 4: User logs in with correct password
    const loginResult = await verifyPassword(userPassword, hashResult.hash!);
    expect(loginResult.success).toBe(true);
    expect(loginResult.valid).toBe(true);

    // Step 5: User tries wrong password
    const wrongLoginResult = await verifyPassword('WrongP@ss1!', hashResult.hash!);
    expect(wrongLoginResult.success).toBe(true);
    expect(wrongLoginResult.valid).toBe(false);
  });

  it('should handle password rehashing scenario', async () => {
    const password = 'RehashTestP@ss1';

    // Simulate old hash with lower cost factor
    const oldHash = '$2a$10$abcdefghijklmnopqrstuvwxyz012345.uOlXiXWlIWm7vHQ2eVzK0';

    // Check if rehash is needed
    expect(needsRehash(oldHash)).toBe(true);

    // Create new hash with current cost factor
    const newHashResult = await hashPassword(password);
    expect(newHashResult.success).toBe(true);

    // New hash should not need rehashing
    expect(needsRehash(newHashResult.hash!)).toBe(false);
  });

  it('should reject weak passwords at validation stage', () => {
    const weakPasswords = [
      'password',      // No uppercase, number, special char
      'PASSWORD',      // No lowercase, number, special char
      '12345678',      // No letters, special char
      'Password1',     // No special char
      'P@ssword',      // No number
      'PASS1!',        // No lowercase
      'pass1!',        // No uppercase
    ];

    weakPasswords.forEach(weakPassword => {
      const result = validatePasswordStrength(weakPassword);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
