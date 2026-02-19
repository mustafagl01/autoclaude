/**
 * Authentication Utilities
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Edge-safe password hashing/verification using Web Crypto PBKDF2.
 */

export interface HashResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  valid?: boolean;
  error?: string;
}

const PBKDF2_ITERATIONS = 210000;
const PBKDF2_KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const HASH_PREFIX = "pbkdf2_sha256";

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8
  );
  return new Uint8Array(bits);
}

function formatHash(iterations: number, salt: Uint8Array, hash: Uint8Array): string {
  return `${HASH_PREFIX}$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

function parseHash(storedHash: string): { iterations: number; salt: Uint8Array; hash: Uint8Array } | null {
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== HASH_PREFIX) return null;

  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return null;

  try {
    return {
      iterations,
      salt: base64ToBytes(parts[2]),
      hash: base64ToBytes(parts[3]),
    };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<HashResult> {
  try {
    if (!password || typeof password !== "string") {
      return { success: false, error: "Password must be a non-empty string" };
    }
    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long" };
    }

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const hash = await deriveKey(password, salt, PBKDF2_ITERATIONS);

    return {
      success: true,
      hash: formatHash(PBKDF2_ITERATIONS, salt, hash),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred while hashing password",
    };
  }
}

export async function verifyPassword(password: string, hash: string): Promise<VerifyResult> {
  try {
    if (!password || typeof password !== "string") {
      return { success: false, error: "Password must be a non-empty string" };
    }
    if (!hash || typeof hash !== "string") {
      return { success: false, error: "Hash must be a non-empty string" };
    }

    const parsed = parseHash(hash);
    if (!parsed) return { success: true, valid: false };

    const computed = await deriveKey(password, parsed.salt, parsed.iterations);
    return {
      success: true,
      valid: timingSafeEqual(computed, parsed.hash),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred while verifying password",
    };
  }
}

export function needsRehash(hash: string): boolean {
  const parsed = parseHash(hash);
  if (!parsed) return true;
  return parsed.iterations < PBKDF2_ITERATIONS;
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password must not exceed 128 characters" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }
  return { valid: true };
}
