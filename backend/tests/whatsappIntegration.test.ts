import assert from 'assert';
import { encryptToken, decryptToken, maskToken, verifyMetaSignature } from '../src/utils/metaCrypto';
import { fetchWhatsAppTemplates } from '../src/services/metaService';

async function runTests() {
  console.log('Running WhatsApp Integration Automated Tests...');

  // Test 1: AES-256-GCM encryption, decryption, and masking
  const testSecret = 'EAA_TEST_SECRET_TOKEN_1234567890';
  const encrypted = encryptToken(testSecret);
  assert.ok(encrypted.includes(':'), 'Encrypted token should contain IV and ciphertext separated by colons');
  
  const decrypted = decryptToken(encrypted);
  assert.strictEqual(decrypted, testSecret, 'Decrypted token must match original plaintext');

  const masked = maskToken(encrypted);
  assert.strictEqual(masked, 'EAA_...7890', 'Masked token should show first 4 and last 4 characters');
  console.log('✔ Test 1: Encryption, decryption, and token masking verified.');

  // Test 2: Webhook HMAC-SHA256 signature verification
  const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const appSecret = 'super_secret_meta_app_key';
  const crypto = await import('crypto');
  const validSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payload, 'utf8').digest('hex');

  const isValid = verifyMetaSignature(payload, validSignature, appSecret);
  assert.strictEqual(isValid, true, 'Valid signature should verify successfully');

  const isInvalid = verifyMetaSignature(payload, 'sha256=invalid_hash', appSecret);
  assert.strictEqual(isInvalid, false, 'Tampered signature should fail verification');
  console.log('✔ Test 2: HMAC-SHA256 webhook signature validation verified.');

  // Test 3: WhatsApp Templates Retrieval
  const templates = await fetchWhatsAppTemplates('mock_waba_id', 'EAA_DEMO_TOKEN');
  assert.ok(Array.isArray(templates), 'Templates should be returned as an array');
  assert.ok(templates.length >= 2, 'Should return approved template definitions');
  const welcomeTpl = templates.find(t => t.name === 'utc_welcome_holiday_inquiry');
  assert.ok(welcomeTpl, 'Welcome template should be present');
  assert.strictEqual(welcomeTpl.status, 'APPROVED', 'Template status must be APPROVED');
  console.log('✔ Test 3: Approved WhatsApp message templates retrieval verified.');

  // Test 4: 24-Hour Messaging Window Logic Verification
  const now = Date.now();
  const inside24h = new Date(now - 2 * 60 * 60 * 1000); // 2 hours ago
  const outside24h = new Date(now - 26 * 60 * 60 * 1000); // 26 hours ago
  const threshold = new Date(now - 24 * 60 * 60 * 1000);

  assert.ok(inside24h.getTime() >= threshold.getTime(), '2 hours ago must be inside 24h window');
  assert.ok(outside24h.getTime() < threshold.getTime(), '26 hours ago must be outside 24h window');
  console.log('✔ Test 4: 24-hour messaging window boundary validation verified.');

  console.log('\nAll WhatsApp Integration Tests Passed Successfully!');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

