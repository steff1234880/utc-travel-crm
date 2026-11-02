/**
 * Production Security Environment Validator
 * Enforces strong, explicit environment variables and halts startup in production if secrets are missing or insecure defaults.
 */

const INSECURE_DEFAULTS = new Set([
  'secret',
  'secret_refresh',
  'utc_secure_db_pass_2026',
  'utc_jwt_production_access_secret_key_32b',
  'utc_jwt_production_refresh_secret_key_32b',
  'utc_meta_permanent_aes_encryption_key_32b',
  'utc-meta-integration-default-salt-32b',
  'utc_travel_meta_verify_token_2026',
  'password',
  '123456',
  'admin',
]);

export function validateProductionEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return; // Allow developer fallbacks in local development / test modes
  }

  const errors: string[] = [];

  // 1. POSTGRES_PASSWORD
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    errors.push('CRITICAL: DATABASE_URL environment variable is required in production.');
  }

  // 2. JWT_ACCESS_SECRET
  const jwtAccess = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '';
  if (!jwtAccess || jwtAccess.length < 32 || INSECURE_DEFAULTS.has(jwtAccess)) {
    errors.push('CRITICAL: JWT_ACCESS_SECRET must be supplied, at least 32 characters, and not match an insecure default value.');
  }

  // 3. JWT_REFRESH_SECRET
  const jwtRefresh = process.env.JWT_REFRESH_SECRET || '';
  if (!jwtRefresh || jwtRefresh.length < 32 || INSECURE_DEFAULTS.has(jwtRefresh)) {
    errors.push('CRITICAL: JWT_REFRESH_SECRET must be supplied, at least 32 characters, and not match an insecure default value.');
  }

  // Enforce distinct JWT secrets
  if (jwtAccess && jwtRefresh && jwtAccess === jwtRefresh) {
    errors.push('CRITICAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct, unique secrets.');
  }

  // 4. META_ENCRYPTION_SECRET (Must be fixed and persistent across restarts)
  const metaEncryption = process.env.META_ENCRYPTION_SECRET || '';
  if (!metaEncryption || metaEncryption.length < 32 || INSECURE_DEFAULTS.has(metaEncryption)) {
    errors.push('CRITICAL: META_ENCRYPTION_SECRET must be set as a permanent, strong 32-character secret in production. Automatic key generation on container restart is strictly prohibited to prevent data loss.');
  }

  // 5. META_VERIFY_TOKEN
  const metaVerify = process.env.META_VERIFY_TOKEN || '';
  if (!metaVerify || metaVerify.length < 8 || INSECURE_DEFAULTS.has(metaVerify)) {
    errors.push('CRITICAL: META_VERIFY_TOKEN must be supplied with a strong random string in production.');
  }

  if (errors.length > 0) {
    console.error('\n================================================================');
    console.error('⛔ FATAL: DOCKER PRODUCTION SECURITY STARTUP HALTED');
    console.error('================================================================');
    errors.forEach(err => console.error(` ❌ ${err}`));
    console.error('\nPlease supply strong secrets in your production deployment environment or .env file.');
    console.error('================================================================\n');
    process.exit(1);
  }
}

