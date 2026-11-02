import crypto from 'crypto';

// Encryption key derived from JWT_ACCESS_SECRET or fallback
const ENCRYPTION_SECRET = process.env.META_ENCRYPTION_SECRET || process.env.JWT_ACCESS_SECRET || 'utc-meta-integration-default-salt-32b';
const ALGORITHM = 'aes-256-gcm';

// Produce exactly 32 bytes key
function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

/**
 * Encrypt sensitive tokens before storing in PostgreSQL
 */
export function encryptToken(token: string): string {
  if (!token) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt token for Meta Graph API calls
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';
  // If it's a legacy or mock plain string without IV separators, return as is
  if (!encryptedString.includes(':')) {
    return encryptedString;
  }
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) return encryptedString;
    const [ivHex, authTagHex, encrypted] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt Meta token:', err);
    return encryptedString;
  }
}

/**
 * Mask access token for safe frontend delivery (never expose raw token)
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return 'Not Configured';
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Validate Meta Webhook HMAC-SHA256 signature
 */
export function verifyMetaSignature(payload: string | Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false;
  try {
    const [algo, signature] = signatureHeader.split('=');
    if (algo !== 'sha256' || !signature) return false;

    const hmac = crypto.createHmac('sha256', appSecret);
    const expected = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * Hash string for Meta Conversions API (SHA256, normalized)
 */
export function hashForCapi(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const normalized = val.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

