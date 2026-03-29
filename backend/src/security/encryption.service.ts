import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * EncryptionService
 * 
 * CRITICAL SECURITY SERVICE
 * 
 * Handles AES-256-GCM encryption/decryption of sensitive data,
 * specifically WhatsApp access tokens.
 * 
 * Security Rules:
 * 1. Master key NEVER exposed or logged
 * 2. Tenant-specific keys derived from master key + tenant_id
 * 3. Each encryption uses unique IV (Initialization Vector)
 * 4. Authentication tag verified on decryption
 * 5. Encrypted data format: iv:authTag:encryptedData (all base64)
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;

  constructor(private configService: ConfigService) {
    const masterKeyBase64 = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (!masterKeyBase64) {
      throw new Error('ENCRYPTION_MASTER_KEY not configured - CRITICAL SECURITY ERROR');
    }

    try {
      this.masterKey = Buffer.from(masterKeyBase64, 'base64');

      if (this.masterKey.length !== 32) {
        throw new Error('ENCRYPTION_MASTER_KEY must be 32 bytes (256 bits)');
      }

      this.logger.log('Encryption service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize encryption service', error);
      throw error;
    }
  }

  /**
   * Derive tenant-specific encryption key
   * Uses HKDF (HMAC-based Key Derivation Function)
   * 
   * @param tenantId - Tenant UUID
   * @returns 32-byte encryption key
   */
  private deriveTenantKey(tenantId: string): Buffer {
    const salt = Buffer.from(tenantId, 'utf-8');
    const info = Buffer.from('techaasvik-tenant-key', 'utf-8');

    // HKDF using SHA-256
    const key = crypto.hkdfSync(
      'sha256',
      this.masterKey,
      salt,
      info,
      32 // 256 bits
    );

    // Ensure we return a Buffer, as hkdfSync might return ArrayBuffer in some environments
    return Buffer.from(key);
  }

  /**
   * Encrypt sensitive data (e.g., WhatsApp access token)
   * 
   * @param tenantId - Tenant UUID
   * @param plaintext - Data to encrypt
   * @returns Encrypted string in format: iv:authTag:encryptedData (base64)
   */
  async encryptToken(tenantId: string, plaintext: string): Promise<string> {
    try {
      // Derive tenant-specific key
      const key = this.deriveTenantKey(tenantId);

      // Generate random IV (12 bytes for GCM)
      const iv = crypto.randomBytes(12);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine: iv:authTag:encryptedData
      const result = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;

      // DO NOT LOG THE RESULT OR PLAINTEXT
      this.logger.debug(`Token encrypted for tenant: ${tenantId}`);

      return result;
    } catch (error) {
      this.logger.error(`Encryption failed for tenant: ${tenantId}`, error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data (e.g., WhatsApp access token)
   * 
   * @param tenantId - Tenant UUID
   * @param encrypted - Encrypted string in format: iv:authTag:encryptedData
   * @returns Decrypted plaintext
   */
  async decryptToken(tenantId: string, encrypted: string): Promise<string> {
    try {
      // Parse encrypted data
      const parts = encrypted.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, authTagBase64, encryptedData] = parts;

      // Decode from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Derive tenant-specific key
      const key = this.deriveTenantKey(tenantId);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // DO NOT LOG THE RESULT
      this.logger.debug(`Token decrypted for tenant: ${tenantId}`);

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed for tenant: ${tenantId}`, error);
      throw new Error('Decryption failed - data may be corrupted or tampered');
    }
  }

  /**
   * Hash sensitive data (one-way, for API keys)
   * 
   * @param data - Data to hash
   * @returns SHA-256 hash (hex)
   */
  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   * 
   * @param length - Length in bytes (default: 32)
   * @returns Random token (hex)
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key with prefix
   * 
   * @param prefix - Key prefix (e.g., 'ta' for Techaasvik)
   * @returns Object with key and hash
   */
  generateApiKey(prefix: string = 'ta'): { key: string; hash: string; prefix: string } {
    const randomPart = this.generateSecureToken(32);
    const key = `${prefix}_${randomPart}`;
    const hash = this.hashData(key);
    const keyPrefix = `${prefix}_${randomPart.substring(0, 8)}`;

    return { key, hash, prefix: keyPrefix };
  }

  /**
   * Verify HMAC signature (for webhooks)
   * 
   * @param payload - Webhook payload
   * @param signature - Received signature
   * @param secret - Webhook secret
   * @returns True if signature is valid
   */
  verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      this.logger.error('HMAC signature verification failed', error);
      return false;
    }
  }
}
