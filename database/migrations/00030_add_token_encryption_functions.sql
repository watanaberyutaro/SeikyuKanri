-- ============================================================================
-- Migration: 00030_add_token_encryption_functions.sql
-- Description: Add Supabase RPC functions for token encryption/decryption
-- Date: 2025-11-06
-- ============================================================================

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. Token Encryption Function
-- ============================================================================
CREATE OR REPLACE FUNCTION encrypt_token(
  plain_text TEXT,
  passphrase TEXT
) RETURNS TEXT AS $$
BEGIN
  -- Use pgp_sym_encrypt to encrypt the token
  -- encode to base64 for storage
  RETURN encode(
    pgp_sym_encrypt(plain_text, passphrase),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION encrypt_token IS 'OAuth トークンを暗号化（pgcrypto pgp_sym_encrypt 使用）';

-- ============================================================================
-- 2. Token Decryption Function
-- ============================================================================
CREATE OR REPLACE FUNCTION decrypt_token(
  encrypted_text TEXT,
  passphrase TEXT
) RETURNS TEXT AS $$
BEGIN
  -- Decode from base64 and decrypt using pgp_sym_decrypt
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    passphrase
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL on decryption failure (invalid key, corrupted data, etc.)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION decrypt_token IS 'OAuth トークンを復号化（pgcrypto pgp_sym_decrypt 使用）';

-- ============================================================================
-- 3. Grant Execution Permissions
-- ============================================================================
-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION encrypt_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_token(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
