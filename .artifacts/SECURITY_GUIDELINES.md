# 🔒 Techaasvik - Security Guidelines & Best Practices

**CRITICAL DOCUMENT - READ BEFORE CODING**

---

## 🚨 Non-Negotiable Security Rules

### Rule #1: Tenant Isolation is MANDATORY
**Every database query MUST include `tenant_id` filter (except Super Admin operations)**

```typescript
// ✅ CORRECT
const contacts = await contactRepo.findByTenant(tenantId, {
  where: { opt_in_status: true }
});

// ❌ WRONG - Cross-tenant access risk!
const contacts = await contactRepo.find({
  where: { opt_in_status: true }
});
```

### Rule #2: Tokens NEVER Leave the Backend
**WhatsApp access tokens are encrypted at rest and NEVER exposed**

```typescript
// ✅ CORRECT
const config = await wabaConfigRepo.findOneByTenant(tenantId);
const decryptedToken = await encryptionService.decryptToken(
  tenantId,
  config.encrypted_access_token
);
// Use token for API call, never return to frontend

// ❌ WRONG - Token exposure!
return {
  waba_id: config.waba_id,
  access_token: decryptedToken // NEVER DO THIS!
};
```

### Rule #3: NO Secrets in Logs
**Sensitive data must NEVER be logged**

```typescript
// ✅ CORRECT
this.logger.log(`Token encrypted for tenant: ${tenantId}`);

// ❌ WRONG - Token in logs!
this.logger.log(`Encrypted token: ${encryptedToken}`);
this.logger.log(`Decrypted token: ${token}`);
```

### Rule #4: Webhook Signatures MUST Be Verified
**All incoming webhooks must have valid signatures**

```typescript
// ✅ CORRECT
const isValid = this.encryptionService.verifyHmacSignature(
  payload,
  signature,
  webhookSecret
);

if (!isValid) {
  throw new UnauthorizedException('Invalid webhook signature');
}

// ❌ WRONG - No verification!
// Process webhook without signature check
```

### Rule #5: Environment-Based Secrets
**All secrets must come from environment variables, NEVER hardcoded**

```typescript
// ✅ CORRECT
const jwtSecret = this.configService.get<string>('JWT_SECRET');

// ❌ WRONG - Hardcoded secret!
const jwtSecret = 'my-secret-key-123';
```

---

## 🔐 Encryption Standards

### WhatsApp Token Encryption

**Algorithm**: AES-256-GCM  
**Key Derivation**: HKDF (HMAC-based Key Derivation Function)  
**IV**: 12 bytes (random per encryption)  
**Auth Tag**: 16 bytes (for integrity verification)

**Format**: `iv:authTag:encryptedData` (all base64)

```typescript
// Encryption flow
const plainToken = "EAABsbCS..."; // From Meta
const encrypted = await encryptionService.encryptToken(tenantId, plainToken);
// Store: "dGVzdA==:YXV0aA==:ZW5jcnlwdGVk"

// Decryption flow
const decrypted = await encryptionService.decryptToken(tenantId, encrypted);
// Use for API call only
```

### Password Hashing

**Algorithm**: bcrypt  
**Rounds**: 12 (configurable)

```typescript
import * as bcrypt from 'bcrypt';

// Hash password
const passwordHash = await bcrypt.hash(plainPassword, 12);

// Verify password
const isValid = await bcrypt.compare(plainPassword, passwordHash);
```

### API Key Generation

**Format**: `ta_<64-char-hex>`  
**Storage**: SHA-256 hash only

```typescript
const { key, hash, prefix } = encryptionService.generateApiKey('ta');
// key: "ta_abc123..." (give to user ONCE)
// hash: "sha256..." (store in database)
// prefix: "ta_abc12345" (for identification)
```

---

## 🛡️ Authentication & Authorization

### JWT Token Structure

```typescript
interface JwtPayload {
  sub: string;           // User ID
  email: string;         // User email
  role: UserRole;        // User role
  tenantId?: string;     // Tenant ID (null for Super Admin)
  permissions: string[]; // Granular permissions
  iat: number;           // Issued at
  exp: number;           // Expires at
}
```

### Token Expiry

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
- **Rotation**: On every refresh

### Role Hierarchy

```
SUPER_ADMIN (Platform-wide access)
  └── Can manage all tenants
  └── Cannot view tenant tokens
  └── Cannot send messages for tenants

TENANT_ADMIN (Tenant owner)
  └── Full access to tenant resources
  └── Can manage team members
  └── Can manage billing

TENANT_MARKETER
  └── Can create campaigns
  └── Can manage contacts
  └── Cannot manage team or billing

TENANT_DEVELOPER
  └── Can generate API keys
  └── Can view webhook logs
  └── Cannot create campaigns

READ_ONLY
  └── View-only access to reports
```

---

## 🔍 Input Validation

### DTO Validation (class-validator)

```typescript
import { IsString, IsEmail, IsUUID, IsOptional, Length } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @Length(10, 20)
  phone: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUUID()
  tenant_id: string; // Will be injected by guard
}
```

### SQL Injection Prevention

**Use TypeORM parameterized queries ONLY**

```typescript
// ✅ CORRECT - Parameterized
const contacts = await contactRepo.find({
  where: { tenant_id: tenantId, phone: userInput }
});

// ❌ WRONG - SQL injection risk!
const contacts = await contactRepo.query(
  `SELECT * FROM tenant_contacts WHERE phone = '${userInput}'`
);
```

### XSS Prevention

**Sanitize all user inputs before storage/display**

```typescript
import { sanitize } from 'class-sanitizer';

@Post()
async createTemplate(@Body() dto: CreateTemplateDto) {
  // Sanitize body text
  dto.body = sanitize(dto.body);
  
  return this.templateService.create(dto);
}
```

---

## 🚦 Rate Limiting

### API Rate Limits

```typescript
// Global rate limit
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per 60 seconds

// Per-tenant rate limit
@UseGuards(TenantRateLimitGuard)
@TenantThrottle(1000, 60) // 1000 requests per tenant per 60 seconds
```

### Message Frequency Caps

```typescript
// Check message frequency before sending
const messagesLast24h = await messageRepo.countByTenant(tenantId, {
  where: {
    contact_id: contactId,
    created_at: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000))
  }
});

if (messagesLast24h >= MAX_MESSAGES_PER_DAY) {
  throw new BadRequestException('Message frequency cap exceeded');
}
```

---

## 📝 Audit Logging

### What to Log

✅ **DO Log**:
- User login attempts (success/failure)
- Tenant creation/approval/suspension
- Campaign launches
- Template submissions
- API key generation/revocation
- Team member invitations
- Compliance violations
- Webhook events

❌ **DON'T Log**:
- Passwords (plain or hashed)
- WhatsApp tokens (encrypted or decrypted)
- API keys (full keys)
- Encryption keys
- Full message bodies (PII)
- Credit card numbers

### Audit Log Format

```typescript
await auditLogRepo.create({
  tenant_id: tenantId,
  user_id: userId,
  action: 'CAMPAIGN_LAUNCHED',
  resource_type: 'CAMPAIGN',
  resource_id: campaignId,
  metadata: {
    campaign_name: 'Summer Sale',
    total_contacts: 1000,
    // NO sensitive data here
  },
  ip_address: request.ip,
  user_agent: request.headers['user-agent'],
});
```

### Sensitive Data Masking

```typescript
// Mask phone numbers in logs
const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
// +1234567890 → +123****890

// Mask email addresses
const maskedEmail = email.replace(/(.{2}).*(@.*)/, '$1***$2');
// user@example.com → us***@example.com
```

---

## 🔗 WhatsApp API Security

### Meta Embedded Signup

**CSRF Protection**:
```typescript
// Generate secure state parameter
const state = crypto.randomBytes(32).toString('hex');
await redis.set(`oauth:state:${state}`, tenantId, 'EX', 600); // 10 min expiry

// Verify state on callback
const storedTenantId = await redis.get(`oauth:state:${state}`);
if (!storedTenantId) {
  throw new UnauthorizedException('Invalid state parameter');
}
```

### Webhook Signature Verification

```typescript
@Post('webhooks/whatsapp/:tenantId')
async handleWebhook(
  @Param('tenantId') tenantId: string,
  @Body() payload: any,
  @Headers('x-hub-signature-256') signature: string,
) {
  // Get webhook secret for tenant
  const webhook = await webhookRepo.findOneByTenant(tenantId);
  const secret = await encryptionService.decryptToken(
    tenantId,
    webhook.encrypted_secret
  );

  // Verify signature
  const isValid = encryptionService.verifyHmacSignature(
    JSON.stringify(payload),
    signature.replace('sha256=', ''),
    secret
  );

  if (!isValid) {
    throw new UnauthorizedException('Invalid webhook signature');
  }

  // Process webhook
  await this.webhookService.process(tenantId, payload);
}
```

---

## 🗄️ Database Security

### Connection Security

```typescript
// TypeORM configuration
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-cert.pem')
  } : false,
  // Connection pooling
  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
  }
}
```

### Row-Level Security (Optional - Advanced)

```sql
-- Enable RLS on tenant tables
ALTER TABLE tenant_contacts ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation ON tenant_contacts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Set tenant context in application
SET app.current_tenant_id = '<tenant-uuid>';
```

---

## 🧪 Security Testing

### Unit Tests

```typescript
describe('EncryptionService', () => {
  it('should encrypt and decrypt token correctly', async () => {
    const plainToken = 'test-token-123';
    const encrypted = await encryptionService.encryptToken(tenantId, plainToken);
    const decrypted = await encryptionService.decryptToken(tenantId, encrypted);
    
    expect(decrypted).toBe(plainToken);
    expect(encrypted).not.toContain(plainToken);
  });

  it('should fail decryption with wrong tenant ID', async () => {
    const encrypted = await encryptionService.encryptToken(tenantId1, 'token');
    
    await expect(
      encryptionService.decryptToken(tenantId2, encrypted)
    ).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
describe('Tenant Isolation', () => {
  it('should prevent cross-tenant access', async () => {
    // Create contacts for two tenants
    await contactRepo.saveByTenant(tenant1, { phone: '1234567890' });
    await contactRepo.saveByTenant(tenant2, { phone: '0987654321' });

    // Tenant 1 should only see their contacts
    const tenant1Contacts = await contactRepo.findByTenant(tenant1);
    expect(tenant1Contacts).toHaveLength(1);
    expect(tenant1Contacts[0].phone).toBe('1234567890');

    // Tenant 2 should only see their contacts
    const tenant2Contacts = await contactRepo.findByTenant(tenant2);
    expect(tenant2Contacts).toHaveLength(1);
    expect(tenant2Contacts[0].phone).toBe('0987654321');
  });
});
```

---

## 🚀 Production Deployment Security

### Environment Variables

```bash
# NEVER commit these to Git!
# Use AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault

# Generate secure secrets
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
ENCRYPTION_MASTER_KEY=$(openssl rand -base64 32)

# Database (use managed service)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Redis (use managed service with AUTH)
REDIS_URL=rediss://user:pass@host:6379

# Meta App (from Meta Developer Console)
META_APP_ID=123456789012345
META_APP_SECRET=<from-meta>
```

### HTTPS/TLS

```typescript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### CORS Configuration

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### Helmet (Security Headers)

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## 📋 Security Checklist

### Before Every Deployment

- [ ] All secrets in environment variables (not hardcoded)
- [ ] `.env` file in `.gitignore`
- [ ] Database connections use SSL/TLS
- [ ] JWT secrets are strong (64+ bytes)
- [ ] Encryption master key is strong (32 bytes)
- [ ] Webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] HTTPS enforced in production
- [ ] Helmet security headers enabled
- [ ] Audit logging enabled
- [ ] No secrets in logs
- [ ] Tenant isolation tested
- [ ] Cross-tenant access prevented
- [ ] Token encryption tested
- [ ] Password hashing tested
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled

---

## 🆘 Security Incident Response

### If a Security Breach Occurs:

1. **Immediate Actions**:
   - Disable affected tenant(s)
   - Revoke compromised tokens
   - Rotate all secrets
   - Enable additional logging

2. **Investigation**:
   - Review audit logs
   - Identify breach vector
   - Assess data exposure
   - Document findings

3. **Remediation**:
   - Patch vulnerability
   - Notify affected users
   - Implement additional controls
   - Update security policies

4. **Post-Incident**:
   - Conduct security review
   - Update documentation
   - Train team on lessons learned
   - Implement preventive measures

---

## 📞 Security Contact

**Security Email**: security@techaasvik.com  
**DO NOT** create public issues for security vulnerabilities.

---

**Remember: Security is not optional. It's the foundation of trust.** 🔒
